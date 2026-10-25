"""Persistent account/session records. No original passwords or raw session tokens."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class UserRecord(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email = lower(email)", name="ck_users_email_lowercase"),
        UniqueConstraint("email", name="uq_users_email"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SessionRecord(Base):
    __tablename__ = "auth_sessions"
    __table_args__ = (
        CheckConstraint("length(token_hash) = 64", name="ck_auth_sessions_token_hash"),
        Index("ix_auth_sessions_user_id", "user_id"),
        Index("ix_auth_sessions_expires_at", "expires_at"),
    )
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    csrf_token: Mapped[str] = mapped_column(String(43), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OnboardingRecord(Base):
    __tablename__ = "onboarding_records"
    __table_args__ = (
        CheckConstraint("relationship IN ('', 'parent', 'legal-guardian')", name="ck_onboarding_relationship"),
        CheckConstraint("age_months IS NULL OR age_months BETWEEN 12 AND 36", name="ck_onboarding_age_months"),
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True,
    )
    about_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_version: Mapped[str | None] = mapped_column(String(64))
    consent_scope: Mapped[str | None] = mapped_column(String(64))
    consent_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    relationship: Mapped[str] = mapped_column(String(32), default="", nullable=False)
    regular_interaction: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    age_months: Mapped[int | None] = mapped_column(Integer)
    eligibility_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AssessmentRecord(Base):
    __tablename__ = "assessment_sessions"
    __table_args__ = (
        CheckConstraint("language IN ('en', 'fil')", name="ck_assessments_language"),
        CheckConstraint("status IN ('in-progress', 'completed')", name="ck_assessments_status"),
        CheckConstraint("current_question_index BETWEEN 0 AND 12", name="ck_assessments_current_question"),
        CheckConstraint("current_clarification_attempts BETWEEN 0 AND 2", name="ck_assessments_clarification_attempts"),
        Index("ix_assessments_user_started", "user_id", "started_at"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    questionnaire_version: Mapped[str] = mapped_column(String(64), nullable=False)
    language: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in-progress", nullable=False)
    current_question_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_clarification_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_consistency_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    questions_snapshot: Mapped[list] = mapped_column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    is_demo_preview: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    custom_title: Mapped[str | None] = mapped_column(String(60))
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AssessmentAnswerRecord(Base):
    __tablename__ = "assessment_answers"
    __table_args__ = (
        CheckConstraint("question_number BETWEEN 1 AND 13", name="ck_assessment_answers_question_number"),
        CheckConstraint("selected_option_id IN ('always', 'sometimes', 'never', 'yes', 'no')", name="ck_assessment_answers_option"),
        CheckConstraint("structured_score BETWEEN 0 AND 2", name="ck_assessment_answers_score"),
        CheckConstraint("length(follow_up_text) <= 4000", name="ck_assessment_answers_follow_up_length"),
        Index("ix_assessment_answers_question_number", "assessment_id", "question_number"),
    )
    assessment_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("assessment_sessions.id", ondelete="CASCADE"), primary_key=True,
    )
    question_id: Mapped[str] = mapped_column(String(8), primary_key=True)
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    selected_option_id: Mapped[str] = mapped_column(String(16), nullable=False)
    structured_score: Mapped[int] = mapped_column(Integer, nullable=False)
    follow_up_text: Mapped[str] = mapped_column(String(4000), default="", nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AssessmentProcessingJobRecord(Base):
    __tablename__ = "assessment_processing_jobs"
    __table_args__ = (
        CheckConstraint("attempt >= 1", name="ck_assessment_processing_attempt"),
        CheckConstraint("status IN ('running', 'failed', 'completed')", name="ck_assessment_processing_status"),
        Index("ix_assessment_processing_status_updated", "status", "updated_at"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    assessment_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("assessment_sessions.id", ondelete="CASCADE"), unique=True, nullable=False,
    )
    attempt: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="running")
    stage_id: Mapped[str | None] = mapped_column(String(32))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failure_code: Mapped[str | None] = mapped_column(String(64))
    result: Mapped[dict | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))


class ChatConversationRecord(Base):
    __tablename__ = "chat_conversations"
    __table_args__ = (Index("ix_chats_user_updated", "user_id", "updated_at"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    custom_title: Mapped[str | None] = mapped_column(String(60))
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ChatMessageRecord(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        UniqueConstraint("conversation_id", "sequence_number", name="uq_chat_message_sequence"),
        UniqueConstraint(
            "conversation_id", "turn_id", "turn_position",
            name="uq_chat_message_turn_position",
        ),
        CheckConstraint("sequence_number >= 0", name="ck_chat_message_sequence"),
        CheckConstraint("role IN ('assistant', 'user')", name="ck_chat_message_role"),
        CheckConstraint("message_type IN ('text', 'education', 'actions')", name="ck_chat_message_type"),
        CheckConstraint("length(content) BETWEEN 1 AND 4000", name="ck_chat_message_content_length"),
        CheckConstraint(
            "(turn_id IS NULL AND turn_position IS NULL) OR "
            "(turn_id IS NOT NULL AND turn_position BETWEEN 0 AND 2)",
            name="ck_chat_message_turn_position",
        ),
        Index("ix_chat_messages_conversation_sequence", "conversation_id", "sequence_number"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    conversation_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False,
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    turn_id: Mapped[UUID | None] = mapped_column(Uuid)
    turn_position: Mapped[int | None] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    message_type: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(String(4000), nullable=False)
    actions: Mapped[list | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    sources: Mapped[list | None] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
