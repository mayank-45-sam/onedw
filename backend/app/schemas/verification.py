"""Pydantic schemas for the worker verification feature."""

from typing import List, Optional, Union
from pydantic import Field

from app.schemas.common import SchemaBase


class SkillTestAnswerItem(SchemaBase):
    question_id: str
    selected_option: Optional[int] = None
    answer: Optional[str] = None
    skipped: bool = False


class AntiCheatPayload(SchemaBase):
    tab_switch_count: int = 0
    warnings_issued: int = 0
    skipped_count: int = 0
    time_per_question: List[dict] = Field(default_factory=list)
    suspicious_fast_answers: List[dict] = Field(default_factory=list)


class SkillTestSubmitRequest(SchemaBase):
    answers: List[SkillTestAnswerItem] = Field(default_factory=list)
    anti_cheat: AntiCheatPayload = Field(default_factory=AntiCheatPayload)


class MediaItem(SchemaBase):
    url: str
    type: str = "image"  # image | video


class PracticalSubmitRequest(SchemaBase):
    media_urls: List[MediaItem] = Field(default_factory=list)


class InterviewRespondRequest(SchemaBase):
    answer: str
    mode: str = "text"  # voice | text


class DocumentsSubmitRequest(SchemaBase):
    profession: Optional[str] = None
    experience_years: Optional[int] = Field(None, ge=0, le=80)
    aadhaar_number: Optional[str] = Field(None, min_length=12, max_length=12, pattern=r"^\d{12}$")
    certificate_images: List[str] = Field(default_factory=list)
    work_photos: List[str] = Field(default_factory=list)
    work_videos: List[str] = Field(default_factory=list)


class AdminNoteRequest(SchemaBase):
    note: str


class RetakeRequest(SchemaBase):
    pass
