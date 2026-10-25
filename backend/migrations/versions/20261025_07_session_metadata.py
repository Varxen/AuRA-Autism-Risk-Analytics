"""Persist titles, pins, and archived state for user sessions."""

from alembic import op
import sqlalchemy as sa

revision = "20261025_07"
down_revision = "20261025_06"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("chat_conversations", "assessment_sessions"):
        op.add_column(table, sa.Column("custom_title", sa.String(length=60), nullable=True))
        op.add_column(table, sa.Column("is_pinned", sa.Boolean(), server_default=sa.false(), nullable=False))
        op.add_column(table, sa.Column("is_archived", sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade():
    for table in ("assessment_sessions", "chat_conversations"):
        op.drop_column(table, "is_archived")
        op.drop_column(table, "is_pinned")
        op.drop_column(table, "custom_title")
