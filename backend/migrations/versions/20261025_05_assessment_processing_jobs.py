"""Persist demo processing job status and retry state."""

from alembic import op
import sqlalchemy as sa

revision = "20261025_05"
down_revision = "20261024_04"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "assessment_processing_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "assessment_id", sa.Uuid(),
            sa.ForeignKey("assessment_sessions.id", ondelete="CASCADE"),
            nullable=False, unique=True,
        ),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(24), nullable=False, server_default="running"),
        sa.Column("stage_id", sa.String(32)),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("failure_code", sa.String(64)),
        sa.CheckConstraint("attempt >= 1", name="ck_assessment_processing_attempt"),
        sa.CheckConstraint(
            "status IN ('running', 'failed', 'demo-completed')",
            name="ck_assessment_processing_status",
        ),
    )
    op.create_index(
        "ix_assessment_processing_status_updated",
        "assessment_processing_jobs", ["status", "updated_at"],
    )


def downgrade():
    # Destructive: back up processing job records before a deliberate rollback.
    op.drop_index("ix_assessment_processing_status_updated", table_name="assessment_processing_jobs")
    op.drop_table("assessment_processing_jobs")
