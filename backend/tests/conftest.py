"""Real PostgreSQL tests use disposable UUID schemas, never public auth records."""

from dataclasses import replace
import re
from uuid import uuid4

import pytest
from sqlalchemy.schema import CreateSchema, DropSchema

from aura_api.config import Settings
from aura_api.database import Base, Database
from aura_api.main import create_app


@pytest.fixture
def make_app():
    base = Settings.from_env()
    admin = Database(base)
    created = []
    databases = []

    def factory(*, create_tables=True, **overrides):
        schema = f"aura_test_{uuid4().hex}"
        with admin.engine.begin() as connection:
            connection.execute(CreateSchema(schema))
        created.append(schema)
        values = {
            "environment": "test", "database_schema": schema,
            "auth_rate_limit": 100, "cookie_secure": False,
        }
        values.update(overrides)
        app = create_app(replace(base, **values))
        databases.append(app.state.database)
        if create_tables:
            Base.metadata.create_all(app.state.database.engine)
        return app

    try:
        yield factory
    finally:
        for database in databases:
            database.engine.dispose()
        for schema in reversed(created):
            # Only fixture-created, validated disposable schemas can be removed.
            assert re.fullmatch(r"aura_test_[a-f0-9]{32}", schema)
            with admin.engine.begin() as connection:
                connection.execute(DropSchema(schema, cascade=True))
        admin.engine.dispose()
