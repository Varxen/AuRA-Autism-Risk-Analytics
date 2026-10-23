"""PostgreSQL engine and transactional sessions. Schema changes use Alembic."""

from sqlalchemy import create_engine, select
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import Settings


class Base(DeclarativeBase):
    pass


class Database:
    def __init__(self, settings: Settings):
        arguments = {"connect_timeout": 5}
        if settings.database_schema:
            arguments["options"] = f"-csearch_path={settings.database_schema}"
        self.engine = create_engine(
            settings.database_url, pool_pre_ping=True, hide_parameters=True,
            connect_args=arguments, pool_size=5, max_overflow=5,
        )
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def verify(self) -> None:
        from .auth.store import SessionRecord, UserRecord

        with self.engine.connect() as connection:
            connection.execute(select(UserRecord).limit(0))
            connection.execute(select(SessionRecord).limit(0))
