"""Persist account-owned information-chat history."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20261024_04"
down_revision = "20261024_03"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "chat_conversations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chats_user_updated", "chat_conversations", ["user_id", "updated_at"])
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("conversation_id", sa.Uuid(), sa.ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
        sa.Column("turn_id", sa.Uuid()),
        sa.Column("turn_position", sa.Integer()),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("message_type", sa.String(16), nullable=False),
        sa.Column("content", sa.String(4000), nullable=False),
        sa.Column("actions", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("sources", postgresql.JSONB(astext_type=sa.Text())),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("conversation_id", "sequence_number", name="uq_chat_message_sequence"),
        sa.UniqueConstraint(
            "conversation_id", "turn_id", "turn_position",
            name="uq_chat_message_turn_position",
        ),
        sa.CheckConstraint("sequence_number >= 0", name="ck_chat_message_sequence"),
        sa.CheckConstraint("role IN ('assistant', 'user')", name="ck_chat_message_role"),
        sa.CheckConstraint("message_type IN ('text', 'education', 'actions')", name="ck_chat_message_type"),
        sa.CheckConstraint("length(content) BETWEEN 1 AND 4000", name="ck_chat_message_content_length"),
        sa.CheckConstraint(
            "(turn_id IS NULL AND turn_position IS NULL) OR "
            "(turn_id IS NOT NULL AND turn_position BETWEEN 0 AND 2)",
            name="ck_chat_message_turn_position",
        ),
    )
    op.create_index(
        "ix_chat_messages_conversation_sequence",
        "chat_messages", ["conversation_id", "sequence_number"],
    )


def downgrade():
    # Destructive: back up chat messages and conversations before a deliberate rollback.
    op.drop_index("ix_chat_messages_conversation_sequence", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_chats_user_updated", table_name="chat_conversations")
    op.drop_table("chat_conversations")
