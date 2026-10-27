"""Authenticated assessment storage, progress and History endpoints."""

from datetime import UTC, datetime
import logging
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .auth.routes import service as auth_service
from .auth.service import AuthService
from .auth.store import AssessmentAnswerRecord, AssessmentProcessingJobRecord, AssessmentRecord
from .assessment_pipeline import (
    encode_feature_vector,
    ModelInferenceError,
    predict_with_soft_voting,
)
from .consistency_model import (
    MAX_CLARIFICATION_ATTEMPTS,
    ConsistencyModelInvalidResponse,
    ConsistencyModelUnavailable,
)
from .errors import APIError
from .onboarding import require_storage_consent
from .questionnaire import QUESTION_COUNT, QUESTIONNAIRE_VERSION, get_questionnaire, option_score
from .result_explanation import (
    OllamaResultExplanation,
    fallback_explanation,
    recommendation_for_category,
)

router = APIRouter(prefix="/api/v1/assessments", tags=["assessments"])

class AnswerInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, populate_by_name=True, alias_generator=to_camel)
    selected_option_id: str = Field(min_length=1, max_length=16)
    follow_up_text: str | None = Field(default=None, max_length=4000)
    approved_suggestion: bool = False


class AssessmentCreateInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, populate_by_name=True, alias_generator=to_camel)
    language: Literal["en", "fil"]
    questionnaire_version: Literal["revised-pilot-testing-2-v1"] = QUESTIONNAIRE_VERSION


class AssessmentAnswerResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, from_attributes=True)
    question_id: str
    question_number: int
    selected_option_id: str
    structured_score: int
    follow_up_text: str
    answered_at: datetime


class QuestionOptionResponse(BaseModel):
    id: str
    label: str
    score: int


class QuestionSnapshotResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    id: str
    question_number: int
    indicator_id: str
    indicator_label: str
    main_question: str
    follow_up_question: str
    language: Literal["en", "fil"]
    questionnaire_version: str
    content_status: Literal["approved"]
    options: list[QuestionOptionResponse]


class AssessmentSessionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    id: UUID
    language: Literal["en", "fil"]
    questionnaire_version: str
    status: Literal["in-progress", "completed"]
    current_question_index: int
    clarification_attempts_used: int
    max_clarification_attempts: int
    consistency_blocked: bool
    answers: list[AssessmentAnswerResponse]
    started_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    is_demo_preview: bool
    custom_title: str | None
    is_pinned: bool
    is_archived: bool
    feature_vector: list[int] | None = None


class AssessmentMetadataInput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, alias_generator=to_camel)
    custom_title: str | None = Field(default=None, max_length=60)
    is_pinned: bool | None = None
    is_archived: bool | None = None

    @model_validator(mode="after")
    def validate_metadata(self):
        if self.custom_title is not None:
            self.custom_title = self.custom_title.strip()
            if not self.custom_title:
                raise ValueError("Session title cannot be blank.")
        if not self.model_fields_set:
            raise ValueError("At least one session setting is required.")
        return self


class AssessmentRecordResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    session: AssessmentSessionResponse
    questions: list[QuestionSnapshotResponse]
    processing_job: "ProcessingJobResponse | None" = None


class ConsistencyGateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    status: Literal["consistent", "contradiction", "unclear"]
    next_action: Literal["continue", "approve_suggestion", "repeat_frequency_and_follow_up", "stop_unresolved"]
    attempts_used: int
    max_attempts: int
    suggested_option_id: str | None = None


class AnswerSubmissionResponse(AssessmentRecordResponse):
    consistency: ConsistencyGateResponse | None = None


class ProcessingJobResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    id: UUID
    assessment_id: UUID
    mode: Literal["model"]
    status: Literal["running", "failed", "completed"]
    stage_id: str | None
    stage_index: int
    total_stages: int
    attempt: int
    started_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    failure_code: str | None
    result_available: bool
    result: "AssessmentResultResponse | None" = None


class InfluentialIndicatorResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    indicator_id: str
    indicator_label: str
    selected_answer: str
    support_change_percentage_points: float


class AssessmentResultResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    assessment_id: UUID
    category: Literal["Low", "Moderate", "High"]
    model_version: str
    probabilities: dict[Literal["Low", "Moderate", "High"], float]
    generated_at: datetime
    explanation: str | None = None
    recommendation: str | None = None
    influential_indicators: list[InfluentialIndicatorResponse] = Field(default_factory=list)
    influence_method: Literal["sometimes-one-at-a-time"] | None = None


def _user_id(request: Request, auth: AuthService) -> UUID:
    session = auth.require_session(request.cookies.get(request.app.state.settings.cookie_name))
    return session.user_id


def _session_for_update(db: Session, user_id: UUID, assessment_id: UUID) -> AssessmentRecord:
    record = db.scalar(
        select(AssessmentRecord)
        .where(AssessmentRecord.id == assessment_id, AssessmentRecord.user_id == user_id)
        .with_for_update()
    )
    if record is None:
        raise APIError(404, "assessment_not_found", "Assessment session was not found.")
    return record


def _answers(db: Session, assessment_id: UUID) -> list[AssessmentAnswerResponse]:
    rows = db.scalars(
        select(AssessmentAnswerRecord)
        .where(AssessmentAnswerRecord.assessment_id == assessment_id)
        .order_by(AssessmentAnswerRecord.question_number)
    )
    return [AssessmentAnswerResponse.model_validate(row) for row in rows]


def _feature_vector(
    db: Session,
    record: AssessmentRecord,
) -> list[int] | None:
    if record.status != "completed" or record.is_demo_preview:
        return None
    rows = db.scalars(
        select(AssessmentAnswerRecord)
        .where(AssessmentAnswerRecord.assessment_id == record.id)
        .order_by(AssessmentAnswerRecord.question_number)
    )
    try:
        return list(encode_feature_vector(
            (answer.question_number, answer.selected_option_id)
            for answer in rows
        ))
    except ValueError as error:
        raise APIError(
            409,
            "feature_vector_incomplete",
            "AuRA cannot encode this assessment until all 13 accepted answers are available.",
        ) from error


def _response(
    db: Session,
    record: AssessmentRecord,
    *,
    include_processing_job: bool = False,
) -> AssessmentRecordResponse:
    session = AssessmentSessionResponse(
        id=record.id,
        language=record.language,
        questionnaire_version=record.questionnaire_version,
        status=record.status,
        current_question_index=record.current_question_index,
        clarification_attempts_used=record.current_clarification_attempts,
        max_clarification_attempts=MAX_CLARIFICATION_ATTEMPTS,
        consistency_blocked=record.current_consistency_blocked,
        answers=_answers(db, record.id),
        started_at=record.started_at,
        updated_at=record.updated_at,
        completed_at=record.completed_at,
        is_demo_preview=record.is_demo_preview,
        custom_title=record.custom_title,
        is_pinned=record.is_pinned,
        is_archived=record.is_archived,
        feature_vector=_feature_vector(db, record),
    )
    processing_job = None
    if include_processing_job:
        job = db.scalar(select(AssessmentProcessingJobRecord).where(
            AssessmentProcessingJobRecord.assessment_id == record.id,
        ))
        if job is not None:
            processing_job = _processing_response(job)
    return AssessmentRecordResponse(
        session=session,
        questions=record.questions_snapshot,
        processing_job=processing_job,
    )


def _current_question(record: AssessmentRecord) -> tuple[int, dict]:
    index = record.current_question_index
    questions = record.questions_snapshot
    if record.status != "in-progress" or index >= len(questions):
        raise APIError(409, "assessment_step_conflict", "This assessment no longer accepts answers.")
    return index + 1, questions[index]


def _processing_response(job: AssessmentProcessingJobRecord) -> ProcessingJobResponse:
    result = AssessmentResultResponse.model_validate(job.result) if job.result is not None else None
    return ProcessingJobResponse(
        id=job.id,
        assessment_id=job.assessment_id,
        mode="model",
        status=job.status,
        stage_id=job.stage_id,
        stage_index=0 if job.status == "running" else 1,
        total_stages=1,
        attempt=job.attempt,
        started_at=job.started_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
        failure_code=job.failure_code,
        result_available=result is not None,
        result=result,
    )


def _completed_assessment_for_update(db: Session, user_id: UUID, assessment_id: UUID) -> AssessmentRecord:
    record = _session_for_update(db, user_id, assessment_id)
    if record.status != "completed":
        raise APIError(409, "assessment_incomplete", "Complete all questionnaire items before processing.")
    if record.is_demo_preview:
        raise APIError(409, "demo_preview_ineligible", "Demo preview answers cannot be classified. Complete a real assessment first.")
    answers = _answers(db, record.id)
    if len(answers) != QUESTION_COUNT or any(
        answer.structured_score != 0 and not answer.follow_up_text.strip()
        for answer in answers
    ):
        raise APIError(409, "assessment_incomplete", "Complete each answer and any required follow-up before processing.")
    return record


def _processing_job_for_update(db: Session, assessment_id: UUID) -> AssessmentProcessingJobRecord:
    job = db.scalar(
        select(AssessmentProcessingJobRecord)
        .where(AssessmentProcessingJobRecord.assessment_id == assessment_id)
        .with_for_update()
    )
    if job is None:
        raise APIError(404, "processing_job_not_found", "Processing job was not found.")
    return job


@router.get("", response_model=list[AssessmentRecordResponse])
def list_assessments(request: Request, auth: AuthService = Depends(auth_service)) -> list[AssessmentRecordResponse]:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        records = list(db.scalars(
            select(AssessmentRecord)
            .where(AssessmentRecord.user_id == user_id)
            .order_by(AssessmentRecord.updated_at.desc())
        ))
        return [_response(db, record, include_processing_job=True) for record in records]


@router.post("", response_model=AssessmentRecordResponse, status_code=201)
def create_assessment(
    body: AssessmentCreateInput,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> AssessmentRecordResponse:
    user_id = _user_id(request, auth)
    questions = get_questionnaire(body.language, body.questionnaire_version)
    now = datetime.now(UTC)
    record = AssessmentRecord(
        id=uuid4(),
        user_id=user_id,
        questionnaire_version=body.questionnaire_version,
        language=body.language,
        status="in-progress",
        current_question_index=0,
        questions_snapshot=questions,
        is_demo_preview=False,
        started_at=now,
        updated_at=now,
    )
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        db.add(record)
        db.flush()
        return _response(db, record)


@router.get("/{assessment_id}", response_model=AssessmentRecordResponse)
def get_assessment(
    assessment_id: UUID,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> AssessmentRecordResponse:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions() as db:
        record = db.scalar(select(AssessmentRecord).where(
            AssessmentRecord.id == assessment_id,
            AssessmentRecord.user_id == user_id,
        ))
        if record is None:
            raise APIError(404, "assessment_not_found", "Assessment session was not found.")
        return _response(db, record)


@router.patch("/{assessment_id}/metadata", response_model=AssessmentRecordResponse)
def update_assessment_metadata(
    assessment_id: UUID,
    body: AssessmentMetadataInput,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> AssessmentRecordResponse:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        record = _session_for_update(db, user_id, assessment_id)
        for field in body.model_fields_set:
            setattr(record, field, getattr(body, field))
        record.updated_at = datetime.now(UTC)
        db.flush()
        return _response(db, record, include_processing_job=True)


@router.put("/{assessment_id}/answers/{question_id}", response_model=AnswerSubmissionResponse)
def save_answer(
    assessment_id: UUID,
    question_id: str,
    body: AnswerInput,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> AnswerSubmissionResponse:
    user_id = _user_id(request, auth)
    model_input = None
    model_attempts = None
    preflight_option_id = None
    model_language = "en"
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        record = _session_for_update(db, user_id, assessment_id)
        if record.current_consistency_blocked:
            raise APIError(409, "consistency_unresolved", "This item remains unresolved after the allowed clarification attempts.")
        question_number, question = _current_question(record)
        if question_id != question["id"]:
            raise APIError(409, "assessment_step_conflict", "Answer the current question first.")
        try:
            score = option_score(question_number, body.selected_option_id)
        except ValueError:
            raise APIError(422, "invalid_answer", "Choose one of the available answer options.") from None
        if body.approved_suggestion and (body.follow_up_text is None or not body.follow_up_text.strip()):
            raise APIError(422, "invalid_suggestion_approval", "The original follow-up response is required to approve a suggested answer.")
        if score == 0 and body.follow_up_text is not None and not body.approved_suggestion:
            raise APIError(422, "follow_up_not_needed", "A follow-up is not required for this answer.")
        existing = db.get(AssessmentAnswerRecord, (record.id, question_id))
        preflight_option_id = existing.selected_option_id if existing is not None else None
        if existing and (existing.structured_score == 0 or existing.follow_up_text) and (
            existing.selected_option_id != body.selected_option_id
            or existing.follow_up_text != (body.follow_up_text or "")
        ):
            raise APIError(409, "answer_immutable", "This completed answer is already saved.")
        consistency = None
        if body.follow_up_text is not None and not body.approved_suggestion:
            if not body.follow_up_text.strip():
                raise APIError(422, "empty_follow_up", "Please enter a response before sending.")
            selected_option = next(
                (option for option in question["options"] if option["id"] == body.selected_option_id),
                None,
            )
            if selected_option is None:
                raise APIError(422, "invalid_answer", "Choose one of the available answer options.")
            model_input = {
                "question_id": question_id,
                "question_number": question_number,
                "indicator": question["indicatorLabel"],
                "main_question": question["mainQuestion"],
                "follow_up_question": question["followUpQuestion"],
                "selected_answer": selected_option["label"],
                "selected_option_id": selected_option["id"],
                "answer_options": [
                    {"id": option["id"], "label": option["label"]}
                    for option in question["options"]
                ],
                "follow_up_text": body.follow_up_text,
                "language": "fil" if record.language == "fil" else "en",
            }
            model_language = model_input["language"]
            model_attempts = record.current_clarification_attempts
        elif body.approved_suggestion and not body.follow_up_text.strip():
            raise APIError(422, "empty_follow_up", "The original follow-up response is required to approve the suggestion.")

    decision = None
    next_action = None
    if model_input is not None:
        try:
            decision, next_action = request.app.state.consistency_model.evaluate(
                **model_input,
                clarification_attempts_used=model_attempts,
                max_clarification_attempts=MAX_CLARIFICATION_ATTEMPTS,
            )
        except ConsistencyModelUnavailable:
            message = (
                "Hindi maabot ang lokal na language model. Tiyaking tumatakbo ang Ollama at naka-load ang model, saka subukan muli."
                if model_language == "fil"
                else "The local language model is unavailable. Make sure Ollama is running and the model is loaded, then try again."
            )
            raise APIError(503, "consistency_model_unavailable", message) from None
        except ConsistencyModelInvalidResponse as error:
            logging.getLogger(__name__).warning(
                "Stage 2.3 rejected Ollama output: %s", error
            )
            message = (
                "Hindi ma-validate nang maayos ng lokal na model ang sagot. Walang na-save; subukan muli."
                if model_language == "fil"
                else "The local model returned an unusable validation result. Nothing was saved; please try again."
            )
            raise APIError(502, "consistency_model_invalid_response", message) from None

    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        record = _session_for_update(db, user_id, assessment_id)
        if record.current_consistency_blocked:
            raise APIError(409, "consistency_unresolved", "This item remains unresolved after the allowed clarification attempts.")
        question_number, question = _current_question(record)
        if question_id != question["id"]:
            raise APIError(409, "assessment_step_conflict", "Answer the current question first.")
        if model_input is not None and record.current_clarification_attempts != model_attempts:
            raise APIError(409, "assessment_step_conflict", "This answer changed while it was being checked. Please submit it again.")
        try:
            score = option_score(question_number, body.selected_option_id)
        except ValueError:
            raise APIError(422, "invalid_answer", "Choose one of the available answer options.") from None
        existing = db.get(AssessmentAnswerRecord, (record.id, question_id))
        if model_input is not None and (existing.selected_option_id if existing is not None else None) != preflight_option_id:
            raise APIError(409, "assessment_step_conflict", "This answer changed while it was being checked. Please submit it again.")
        now = datetime.now(UTC)
        if existing and (existing.structured_score == 0 or existing.follow_up_text) and (
            existing.selected_option_id != body.selected_option_id
            or existing.follow_up_text != (body.follow_up_text or "")
        ):
            raise APIError(409, "answer_immutable", "This completed answer is already saved.")
        consistency = None
        if decision is not None and next_action is not None:
            consistency = ConsistencyGateResponse(
                status=decision.outcome.value,
                next_action=next_action,
                attempts_used=record.current_clarification_attempts,
                max_attempts=MAX_CLARIFICATION_ATTEMPTS,
                suggested_option_id=decision.suggested_option_id,
            )
            if next_action != "continue":
                if existing and not existing.follow_up_text:
                    db.delete(existing)
                if next_action == "repeat_frequency_and_follow_up":
                    record.current_clarification_attempts += 1
                elif next_action == "stop_unresolved":
                    record.current_consistency_blocked = True
                record.updated_at = now
                db.flush()
                snapshot = _response(db, record)
                return AnswerSubmissionResponse(
                    session=snapshot.session,
                    questions=snapshot.questions,
                    processing_job=snapshot.processing_job,
                    consistency=consistency,
                )

        if existing is None:
            db.add(AssessmentAnswerRecord(
                assessment_id=record.id,
                question_id=question_id,
                question_number=question_number,
                selected_option_id=body.selected_option_id,
                structured_score=score,
                follow_up_text=body.follow_up_text or "",
                answered_at=now,
            ))
        elif existing.follow_up_text:
            if existing.selected_option_id != body.selected_option_id or existing.follow_up_text != (body.follow_up_text or ""):
                raise APIError(409, "answer_immutable", "This completed answer is already saved.")
        else:
            existing.selected_option_id = body.selected_option_id
            existing.structured_score = score
            if body.follow_up_text is not None:
                existing.follow_up_text = body.follow_up_text
                existing.answered_at = now
        if body.follow_up_text is not None:
            record.current_clarification_attempts = 0
            record.current_consistency_blocked = False
        record.updated_at = now
        db.flush()
        snapshot = _response(db, record)
        return AnswerSubmissionResponse(
            session=snapshot.session,
            questions=snapshot.questions,
            processing_job=snapshot.processing_job,
            consistency=consistency,
        )


@router.post("/{assessment_id}/advance", response_model=AssessmentRecordResponse)
def advance_assessment(
    assessment_id: UUID,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> AssessmentRecordResponse:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        record = _session_for_update(db, user_id, assessment_id)
        if record.current_consistency_blocked:
            raise APIError(409, "consistency_unresolved", "This item remains unresolved after the allowed clarification attempts.")
        question_number, question = _current_question(record)
        answer = db.get(AssessmentAnswerRecord, (record.id, question["id"]))
        if answer is None or (answer.structured_score != 0 and not answer.follow_up_text.strip()):
            raise APIError(409, "follow_up_required", "Save the required follow-up before advancing.")
        now = datetime.now(UTC)
        record.updated_at = now
        record.current_clarification_attempts = 0
        record.current_consistency_blocked = False
        if question_number == QUESTION_COUNT:
            record.status = "completed"
            record.completed_at = now
        else:
            record.current_question_index += 1
        db.flush()
        return _response(db, record)


def _run_model_inference(
    job: AssessmentProcessingJobRecord,
    assessment_id: UUID,
    feature_vector: list[int],
    questions_snapshot: list[dict],
    language: str,
    result_explainer: OllamaResultExplanation,
) -> None:
    now = datetime.now(UTC)
    try:
        prediction = predict_with_soft_voting(feature_vector)
        support_changes = prediction["support_changes"]
        influential_indicators = []
        for change in support_changes:
            index = change["feature_index"]
            change_points = round(float(change["support_change"]) * 100, 1)
            if abs(change_points) < 1.0 or index >= len(questions_snapshot):
                continue
            question = questions_snapshot[index]
            selected_option = next(
                option for option in question["options"] if option["score"] == feature_vector[index]
            )
            influential_indicators.append({
                "indicator_id": question["indicatorId"],
                "indicator_label": question["indicatorLabel"],
                "selected_answer": selected_option["label"],
                "support_change_percentage_points": change_points,
            })
        influential_indicators.sort(
            key=lambda item: abs(item["support_change_percentage_points"]),
            reverse=True,
        )
        influential_indicators = influential_indicators[:5]
        try:
            explanation = result_explainer.explain(
                category=prediction["category"],
                probabilities=prediction["probabilities"],
                indicators=influential_indicators,
                language=language,
            )
        except (RuntimeError, ValueError):
            logging.getLogger(__name__).exception(
                "Post-ML explanation failed; saving the localized fallback."
            )
            explanation = fallback_explanation(prediction["category"], language, influential_indicators)

        job.result = AssessmentResultResponse(
            assessment_id=assessment_id,
            category=prediction["category"],
            model_version=prediction["model_version"],
            probabilities=prediction["probabilities"],
            generated_at=now,
            explanation=explanation,
            recommendation=recommendation_for_category(prediction["category"], language),
            influential_indicators=influential_indicators,
            influence_method="sometimes-one-at-a-time",
        ).model_dump(mode="json", by_alias=True)
        job.status = "completed"
        job.failure_code = None
    except ModelInferenceError:
        logging.getLogger(__name__).exception("Assessment model inference failed.")
        job.status = "failed"
        job.failure_code = "model_inference_failed"
        job.result = None
    job.stage_id = None
    job.completed_at = now
    job.updated_at = now


@router.post("/{assessment_id}/processing", response_model=ProcessingJobResponse)
def start_processing(
    assessment_id: UUID,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> ProcessingJobResponse:
    user_id = _user_id(request, auth)
    now = datetime.now(UTC)
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        record = _completed_assessment_for_update(db, user_id, assessment_id)
        feature_vector = _feature_vector(db, record)
        if feature_vector is None:
            raise APIError(409, "feature_vector_incomplete", "This assessment does not contain an eligible feature vector.")
        job = db.scalar(
            select(AssessmentProcessingJobRecord)
            .where(AssessmentProcessingJobRecord.assessment_id == record.id)
            .with_for_update()
        )
        if job is None:
            job = AssessmentProcessingJobRecord(
                id=uuid4(), assessment_id=record.id, attempt=1, status="running",
                stage_id="soft-voting", started_at=now, updated_at=now,
            )
            db.add(job)
            db.flush()
        if job.status == "completed" or job.status == "failed":
            return _processing_response(job)
        job.stage_id = "soft-voting"
        _run_model_inference(
            job, record.id, feature_vector, record.questions_snapshot, record.language,
            request.app.state.result_explainer,
        )
        return _processing_response(job)


@router.get("/{assessment_id}/processing", response_model=ProcessingJobResponse)
def get_processing(
    assessment_id: UUID,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> ProcessingJobResponse:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        _completed_assessment_for_update(db, user_id, assessment_id)
        job = _processing_job_for_update(db, assessment_id)
        return _processing_response(job)


@router.post("/{assessment_id}/processing/retry", response_model=ProcessingJobResponse)
def retry_processing(
    assessment_id: UUID,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> ProcessingJobResponse:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        require_storage_consent(db, user_id)
        _completed_assessment_for_update(db, user_id, assessment_id)
        job = _processing_job_for_update(db, assessment_id)
        if job.status == "completed":
            return _processing_response(job)
        if job.status != "running":
            job.attempt += 1
        job.status = "running"
        job.stage_id = "soft-voting"
        job.started_at = datetime.now(UTC)
        job.updated_at = job.started_at
        job.completed_at = None
        job.failure_code = None
        job.result = None
        record = _session_for_update(db, user_id, assessment_id)
        feature_vector = _feature_vector(db, record)
        if feature_vector is None:
            raise APIError(409, "feature_vector_incomplete", "This assessment does not contain an eligible feature vector.")
        _run_model_inference(
            job, assessment_id, feature_vector, record.questions_snapshot, record.language,
            request.app.state.result_explainer,
        )
        return _processing_response(job)


@router.delete("/{assessment_id}", status_code=204)
def delete_assessment(
    assessment_id: UUID,
    request: Request,
    auth: AuthService = Depends(auth_service),
) -> Response:
    user_id = _user_id(request, auth)
    with request.app.state.database.sessions.begin() as db:
        record = _session_for_update(db, user_id, assessment_id)
        db.execute(delete(AssessmentRecord).where(AssessmentRecord.id == record.id))
    return Response(status_code=204)
