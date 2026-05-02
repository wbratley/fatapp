from datetime import datetime

from pydantic import BaseModel, Field


class FoodItemBase(BaseModel):
    name: str
    barcode: str | None = None
    calories_per_100g: float = Field(..., gt=0)


class FoodItemCreate(FoodItemBase):
    pass


class FoodItemUpdate(BaseModel):
    name: str | None = None
    barcode: str | None = None
    calories_per_100g: float | None = Field(None, gt=0)


class FoodItemResponse(FoodItemBase):
    id: int
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}
