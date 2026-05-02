from datetime import UTC, datetime

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class CalorieConsumeRecordCreate(BaseModel):
    food_item_id: int
    grams: float = Field(..., gt=0)
    timestamp: datetime = Field(default_factory=_now)


class CalorieConsumeRecordUpdate(BaseModel):
    grams: float | None = Field(None, gt=0)
    timestamp: datetime | None = None


class CalorieConsumeRecordResponse(BaseModel):
    id: int
    food_item_id: int
    food_item_name: str
    grams: float
    timestamp: datetime
    total_calories: float
