from datetime import datetime

from pydantic import BaseModel, Field


class WeightEntryBase(BaseModel):
    weight: float = Field(..., gt=0, description="Weight in kg")
    date: datetime


class WeightEntryCreate(WeightEntryBase):
    pass


class WeightEntryUpdate(BaseModel):
    weight: float | None = Field(None, gt=0)
    date: datetime | None = None


class WeightEntryResponse(WeightEntryBase):
    id: int

    model_config = {"from_attributes": True}
