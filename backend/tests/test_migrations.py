from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import inspect

from aura_api.database import Base


def test_auth_migration_upgrade_matches_models_and_rolls_back_only_isolated_schema(make_app):
    app = make_app(create_tables=False)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with app.state.database.engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        names = inspect(connection).get_table_names(schema=app.state.settings.database_schema)
        assert set(names) == {
            "users", "auth_sessions", "onboarding_records",
            "assessment_sessions", "assessment_answers", "chat_conversations",
            "chat_messages", "assessment_processing_jobs", "alembic_version",
        }
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
        command.downgrade(config, "base")
        assert set(inspect(connection).get_table_names(schema=app.state.settings.database_schema)) == {"alembic_version"}
