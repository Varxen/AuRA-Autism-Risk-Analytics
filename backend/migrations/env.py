"""Migrations use the same ignored .env settings as the API; never log the DSN."""

from alembic import context

from aura_api.auth import store  # noqa: F401 -- register model metadata
from aura_api.config import Settings
from aura_api.database import Base, Database

config = context.config
target_metadata = Base.metadata


def run(connection):
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    settings = Settings.from_env()
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    supplied_connection = config.attributes.get("connection")
    if supplied_connection is not None:
        run(supplied_connection)
    else:
        database = Database(Settings.from_env())
        try:
            with database.engine.connect() as connection:
                run(connection)
        finally:
            database.engine.dispose()
