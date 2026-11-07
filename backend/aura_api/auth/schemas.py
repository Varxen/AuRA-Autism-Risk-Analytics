from datetime import datetime
from email.headerregistry import Address
from email.errors import HeaderParseError
import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator
from pydantic.alias_generators import to_camel


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    email: str = Field(min_length=3, max_length=254)
    password: SecretStr = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if (
            value.count("@") != 1
            or not value.isascii()
            or any(ord(character) < 33 or ord(character) > 126 for character in value)
        ):
            raise ValueError("Enter a valid email address.")
        try:
            address = Address(addr_spec=value)
        except (ValueError, HeaderParseError) as cause:
            raise ValueError("Enter a valid email address.") from cause
        if (
            not address.username
            or len(address.username) > 64
            or not address.domain
            or "." not in address.domain
            or value != f"{address.username}@{address.domain}"
            or any(
                not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
                for label in address.domain.split(".")
            )
        ):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("password")
    @classmethod
    def reject_blank_password(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().strip():
            raise ValueError("Use a nonblank password of 8 to 128 characters.")
        return value


class DeleteAccountInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator("password")
    @classmethod
    def reject_blank_password(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().strip():
            raise ValueError("Enter your password to confirm account deletion.")
        return value


class PublicUser(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: UUID
    email: str
    role: Literal["parent_guardian"] = "parent_guardian"
    email_verified: bool = False
    created_at: datetime


class SessionResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    user: PublicUser
    csrf_token: str
    expires_at: datetime
    idle_expires_at: datetime
