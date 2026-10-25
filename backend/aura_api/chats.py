"""Account-owned information-chat conversations and History."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .auth.routes import service as auth_service
from .auth.service import AuthService
from .auth.store import ChatConversationRecord, ChatMessageRecord
from .errors import APIError
from .onboarding import require_storage_consent

router = APIRouter(prefix="/api/v1/chats", tags=["chats"])
MAX_MESSAGES_PER_CHAT = 500


class ChatActionValue(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Literal["education", "assessment", "learn-more"]
    label: str = Field(min_length=1, max_length=100)


class AssistantMessageInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["text", "education", "actions"]
    content: str = Field(min_length=1, max_length=4000)
    actions: list[ChatActionValue] | None = Field(default=None, max_length=3)
    sources: list[str] | None = Field(default=None, max_length=10)

    @model_validator(mode="after")
    def validate_metadata(self):
        if (self.type == "actions") != bool(self.actions):
            raise ValueError("Only action messages must include actions.")
        if self.sources and self.type != "education":
            raise ValueError("Sources can only be attached to educational messages.")
        if any(not source.strip() or len(source) > 200 for source in self.sources or []):
            raise ValueError("Sources must be non-empty and at most 200 characters.")
        return self


class ChatTurnInput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, alias_generator=to_camel)
    turn_id: UUID
    user_content: str = Field(min_length=1, max_length=4000)
    assistant_messages: list[AssistantMessageInput] = Field(min_length=1, max_length=2)


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    id: UUID
    conversation_id: UUID
    role: Literal["assistant", "user"]
    type: Literal["text", "education", "actions"]
    content: str
    timestamp: datetime
    actions: list[ChatActionValue] | None
    sources: list[str] | None


class ChatConversationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    id: UUID
    messages: list[ChatMessageResponse]
    custom_title: str | None
    is_pinned: bool
    is_archived: bool


class ChatMetadataInput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, alias_generator=to_camel)
    custom_title: str | None = Field(default=None, max_length=60)
    is_pinned: bool | None = None
    is_archived: bool | None = None

    @model_validator(mode="after")
    def validate_title(self):
        if self.custom_title is not None:
            self.custom_title = self.custom_title.strip()
            if not self.custom_title:
                raise ValueError("Session title cannot be blank.")
        if not self.model_fields_set:
            raise ValueError("At least one session setting is required.")
        return self


class ChatTurnResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    user_message: ChatMessageResponse
    assistant_messages: list[ChatMessageResponse]


def _user_id(request: Request, auth: AuthService) -> UUID:
    settings = request.app.state.settings
    session = auth.require_session(request.cookies.get(settings.cookie_name))
    return session.user_id


def _owned_conversation(db: Session, user_id: UUID, conversation_id: UUID, *, lock: bool = False):
    query = select(ChatConversationRecord).where(
        ChatConversationRecord.id == conversation_id,
        ChatConversationRecord.user_id == user_id,
    )
    if lock:
        query = query.with_for_update()
    record = db.scalar(query)
    if record is None:
        raise APIError(404, "chat_not_found", "Chat conversation was not found.")
    return record


def _message_response(message: ChatMessageRecord) -> ChatMessageResponse:
    return ChatMessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        role=message.role,
        type=message.message_type,
        content=message.content,
        timestamp=message.created_at,
        actions=message.actions,
        sources=message.sources,
    )


def _messages(db: Session, conversation_id: UUID) -> list[ChatMessageResponse]:
    return [
        _message_response(message)
        for message in db.scalars(
            select(ChatMessageRecord)
            .where(ChatMessageRecord.conversation_id == conversation_id)
            .order_by(ChatMessageRecord.sequence_number)
        )
    ]


def _conversation(db: Session, record: ChatConversationRecord) -> ChatConversationResponse:
    return ChatConversationResponse(
        id=record.id,
        messages=_messages(db, record.id),
        custom_title=record.custom_title,
        is_pinned=record.is_pinned,
        is_archived=record.is_archived,
    )


def _same_turn(existing: list[ChatMessageRecord], body: ChatTurnInput) -> bool:
    expected = [("user", "text", body.user_content, None, None)] + [
        (
            "assistant",
            message.type,
            message.content,
            [action.model_dump(mode="json") for action in message.actions] if message.actions else None,
            message.sources or None,
        )
        for message in body.assistant_messages
    ]
    if len(existing) != len(expected):
        return False
    return all(
        (row.role, row.message_type, row.content, row.actions, row.sources) == values
        for row, values in zip(existing, expected)
    )


@router.get("", response_model=list[ChatConversationResponse])
def list_chats(request: Request, auth: AuthService = Depends(auth_service)):
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions() as db:
        records = list(db.scalars(
            select(ChatConversationRecord)
            .where(ChatConversationRecord.user_id == user_id)
            .order_by(ChatConversationRecord.updated_at.desc())
        ))
        return [_conversation(db, record) for record in records]


@router.post("", response_model=ChatConversationResponse, status_code=201)
def create_chat(request: Request, auth: AuthService = Depends(auth_service)):
    user_id = _user_id(request, auth)
    now = datetime.now(UTC)
    record = ChatConversationRecord(id=uuid4(), user_id=user_id, started_at=now, updated_at=now)
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        db.add(record)
        db.flush()
        db.add(ChatMessageRecord(
            id=uuid4(),
            conversation_id=record.id,
            sequence_number=0,
            turn_id=None,
            turn_position=None,
            role="assistant",
            message_type="text",
            content="Hello! I’m AuRA, your autism information assistant.\n\nHow can I help you today?",
            actions=None,
            sources=None,
            created_at=now,
        ))
        db.flush()
        return _conversation(db, record)


@router.get("/{conversation_id}", response_model=ChatConversationResponse)
def get_chat(conversation_id: UUID, request: Request, auth: AuthService = Depends(auth_service)):
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions() as db:
        return _conversation(db, _owned_conversation(db, user_id, conversation_id))


@router.patch("/{conversation_id}/metadata", response_model=ChatConversationResponse)
def update_chat_metadata(
    conversation_id: UUID,
    body: ChatMetadataInput,
    request: Request,
    auth: AuthService = Depends(auth_service),
):
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        record = _owned_conversation(db, user_id, conversation_id, lock=True)
        for field in body.model_fields_set:
            setattr(record, field, getattr(body, field))
        db.flush()
        return _conversation(db, record)


@router.post("/{conversation_id}/turns", response_model=ChatTurnResponse)
def save_turn(
    conversation_id: UUID,
    body: ChatTurnInput,
    request: Request,
    auth: AuthService = Depends(auth_service),
):
    if not body.user_content.strip() or any(not message.content.strip() for message in body.assistant_messages):
        raise APIError(422, "empty_chat_message", "Chat messages cannot be empty.")
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        conversation = _owned_conversation(db, user_id, conversation_id, lock=True)
        existing = list(db.scalars(
            select(ChatMessageRecord)
            .where(
                ChatMessageRecord.conversation_id == conversation_id,
                ChatMessageRecord.turn_id == body.turn_id,
            )
            .order_by(ChatMessageRecord.turn_position)
        ))
        if existing:
            if not _same_turn(existing, body):
                raise APIError(409, "chat_turn_conflict", "This chat turn already has different saved content.")
            rows = [_message_response(message) for message in existing]
            return ChatTurnResponse(user_message=rows[0], assistant_messages=rows[1:])

        last_sequence = db.scalar(
            select(func.max(ChatMessageRecord.sequence_number)).where(
                ChatMessageRecord.conversation_id == conversation_id,
            )
        )
        first_sequence = (last_sequence if last_sequence is not None else -1) + 1
        if first_sequence + len(body.assistant_messages) >= MAX_MESSAGES_PER_CHAT:
            raise APIError(409, "chat_message_limit", "This chat reached its message limit. Start a new chat to continue.")

        now = datetime.now(UTC)
        rows = [ChatMessageRecord(
            id=body.turn_id,
            conversation_id=conversation_id,
            sequence_number=first_sequence,
            turn_id=body.turn_id,
            turn_position=0,
            role="user",
            message_type="text",
            content=body.user_content,
            actions=None,
            sources=None,
            created_at=now,
        )]
        for position, message in enumerate(body.assistant_messages, start=1):
            rows.append(ChatMessageRecord(
                id=uuid4(),
                conversation_id=conversation_id,
                sequence_number=first_sequence + position,
                turn_id=body.turn_id,
                turn_position=position,
                role="assistant",
                message_type=message.type,
                content=message.content,
                actions=[action.model_dump(mode="json") for action in message.actions] if message.actions else None,
                sources=message.sources or None,
                created_at=now,
            ))
        db.add_all(rows)
        conversation.updated_at = now
        db.flush()
        saved = [_message_response(message) for message in rows]
        return ChatTurnResponse(user_message=saved[0], assistant_messages=saved[1:])


@router.delete("/{conversation_id}", status_code=204)
def delete_chat(
    conversation_id: UUID,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> Response:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        record = _owned_conversation(db, user_id, conversation_id, lock=True)
        db.delete(record)
    return Response(status_code=204)
