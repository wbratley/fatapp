from datetime import datetime

from pydantic import BaseModel, Field


class MealItemCreate(BaseModel):
    food_item_id: int
    grams: float = Field(..., gt=0)


class MealItemUpdate(BaseModel):
    grams: float = Field(..., gt=0)


class MealItemResponse(BaseModel):
    id: int
    meal_id: int
    food_item_id: int
    food_item_name: str
    grams: float
    calories: float


class MealCreate(BaseModel):
    name: str
    items: list[MealItemCreate] = []


class MealUpdate(BaseModel):
    name: str | None = None


class MealResponse(BaseModel):
    id: int
    name: str
    total_calories: float
    deleted_at: datetime | None = None
    items: list[MealItemResponse]
