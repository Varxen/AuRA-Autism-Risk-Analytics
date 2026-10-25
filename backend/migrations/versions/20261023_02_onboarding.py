"""Persist consent and onboarding eligibility owned by each account."""

from alembic import op
import sqlalchemy as sa

revision = "20261023_02"
down_revision = "20261023_01"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "onboarding_records",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("about_acknowledged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("consent_version", sa.String(64)),
        sa.Column("consent_scope", sa.String(64)),
        sa.Column("consent_accepted_at", sa.DateTime(timezone=True)),
        sa.Column("relationship", sa.String(32), nullable=False, server_default=""),
        sa.Column("regular_interaction", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("age_months", sa.Integer()),
        sa.Column("eligibility_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("relationship IN ('', 'parent', 'legal-guardian')", name="ck_onboarding_relationship"),
        sa.CheckConstraint("age_months IS NULL OR age_months BETWEEN 12 AND 36", name="ck_onboarding_age_months"),
    )


def downgrade():
    # Destructive: back up onboarding and consent records before a deliberate rollback.
    op.drop_table("onboarding_records")
