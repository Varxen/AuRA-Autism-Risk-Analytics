"""Persist account-owned assessment sessions and original answers."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261024_03"
down_revision = "20261023_02"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "assessment_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("questionnaire_version", sa.String(64), nullable=False),
        sa.Column("language", sa.String(3), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="in-progress"),
        sa.Column("current_question_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("questions_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_demo_preview", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("language IN ('en', 'fil')", name="ck_assessments_language"),
        sa.CheckConstraint("status IN ('in-progress', 'completed')", name="ck_assessments_status"),
        sa.CheckConstraint("current_question_index BETWEEN 0 AND 12", name="ck_assessments_current_question"),
    )
    op.create_index("ix_assessments_user_started", "assessment_sessions", ["user_id", "started_at"])
    op.create_table(
        "assessment_answers",
        sa.Column("assessment_id", sa.Uuid(), sa.ForeignKey("assessment_sessions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("question_id", sa.String(8), primary_key=True),
        sa.Column("question_number", sa.Integer(), nullable=False),
        sa.Column("selected_option_id", sa.String(16), nullable=False),
        sa.Column("structured_score", sa.Integer(), nullable=False),
        sa.Column("follow_up_text", sa.String(4000), nullable=False, server_default=""),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("question_number BETWEEN 1 AND 13", name="ck_assessment_answers_question_number"),
        sa.CheckConstraint("selected_option_id IN ('always', 'sometimes', 'never', 'yes', 'no')", name="ck_assessment_answers_option"),
        sa.CheckConstraint("structured_score BETWEEN 0 AND 2", name="ck_assessment_answers_score"),
        sa.CheckConstraint("length(follow_up_text) <= 4000", name="ck_assessment_answers_follow_up_length"),
    )
    op.create_index("ix_assessment_answers_question_number", "assessment_answers", ["assessment_id", "question_number"])


def downgrade():
    # Destructive: back up assessment records before a deliberate rollback.
    op.drop_index("ix_assessment_answers_question_number", table_name="assessment_answers")
    op.drop_table("assessment_answers")
    op.drop_index("ix_assessments_user_started", table_name="assessment_sessions")
    op.drop_table("assessment_sessions")
