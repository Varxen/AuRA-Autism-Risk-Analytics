"""Persist model inference results and remove demo-only job status."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261025_08"
down_revision = "20261025_07"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint(
        "ck_assessment_processing_status",
        "assessment_processing_jobs",
        type_="check",
    )
    op.execute(
        "UPDATE assessment_processing_jobs "
        "SET status = 'failed', failure_code = 'legacy_demo_removed', "
        "stage_id = NULL, completed_at = updated_at "
        "WHERE status = 'demo-completed'"
    )
    op.create_check_constraint(
        "ck_assessment_processing_status",
        "assessment_processing_jobs",
        "status IN ('running', 'failed', 'completed')",
    )
    op.add_column(
        "assessment_processing_jobs",
        sa.Column("result", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=True),
    )


def downgrade():
    op.drop_column("assessment_processing_jobs", "result")
    op.drop_constraint(
        "ck_assessment_processing_status",
        "assessment_processing_jobs",
        type_="check",
    )
    op.execute(
        "UPDATE assessment_processing_jobs "
        "SET status = 'demo-completed' WHERE failure_code = 'legacy_demo_removed'"
    )
    op.create_check_constraint(
        "ck_assessment_processing_status",
        "assessment_processing_jobs",
        "status IN ('running', 'failed', 'demo-completed')",
    )
