from pydantic import EmailStr, Field

from app.schemas.common import SchemaBase


class SupportContactRequest(SchemaBase):
    name: str = Field(..., min_length=2, max_length=255, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    subject: str = Field(..., min_length=3, max_length=255, examples=["Booking issue"])
    message: str = Field(..., min_length=10, max_length=5000, examples=["I need help with a recent booking."])
