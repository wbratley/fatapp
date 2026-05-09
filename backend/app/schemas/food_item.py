from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class FoodItemBase(BaseModel):
    name: str
    barcode: str | None = None
    calories_per_100g: float = Field(..., gt=0)
    portion_size_g: float | None = Field(None, gt=0)
    portion_label: str | None = None


class FoodItemCreate(FoodItemBase):
    @model_validator(mode='after')
    def _check_portion_pair(self):
        if (self.portion_size_g is None) != (self.portion_label is None):
            raise ValueError('portion_size_g and portion_label must both be set or both be null')
        return self


class FoodItemUpdate(BaseModel):
    name: str | None = None
    barcode: str | None = None
    calories_per_100g: float | None = Field(None, gt=0)
    portion_size_g: float | None = Field(None, gt=0)
    portion_label: str | None = None

    @model_validator(mode='after')
    def _check_portion_pair(self):
        if (self.portion_size_g is None) != (self.portion_label is None):
            raise ValueError('portion_size_g and portion_label must both be set or both be null')
        return self


class FoodItemResponse(FoodItemBase):
    id: int
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


class BarcodeLookupResponse(BaseModel):
    found: bool
    food_item: FoodItemResponse | None = None


class FoodItemRefreshResponse(BaseModel):
    food_item: FoodItemResponse
    changes: list[str]
