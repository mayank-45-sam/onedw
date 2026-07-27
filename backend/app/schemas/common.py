"""Shared Pydantic schema types (extend as domain schemas are added)."""

from pydantic import BaseModel, ConfigDict


def _snake_to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class SchemaBase(BaseModel):
    """Base schema with shared Pydantic v2 configuration.

    Accepts both snake_case and camelCase input fields via alias_generator
    and ``populate_by_name``.  Output always uses the snake_case field names.
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
        alias_generator=_snake_to_camel,
    )
