"""Track clarification retries on the active assessment question."""

from alembic import op
import sqlalchemy as sa

revision = "20261025_06"
down_revision = "20261025_05"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "assessment_sessions",
        sa.Column("current_clarification_attempts", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "assessment_sessions",
        sa.Column("current_consistency_blocked", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_check_constraint(
        "ck_assessments_clarification_attempts",
        "assessment_sessions",
        "current_clarification_attempts BETWEEN 0 AND 2",
    )


def downgrade():
    op.drop_constraint("ck_assessments_clarification_attempts", "assessment_sessions", type_="check")
    op.drop_column("assessment_sessions", "current_consistency_blocked")
    op.drop_column("assessment_sessions", "current_clarification_attempts")
