from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.food_item import FoodItem


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    total_calories: Mapped[float] = mapped_column(Float, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    items: Mapped[list["MealItem"]] = relationship(
        "MealItem", back_populates="meal", cascade="all, delete-orphan"
    )


class MealItem(Base):
    __tablename__ = "meal_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    meal_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("meals.id"), nullable=False, index=True
    )
    food_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("food_items.id"), nullable=False, index=True
    )
    grams: Mapped[float] = mapped_column(Float, nullable=False)
    calories: Mapped[float] = mapped_column(Float, nullable=False)

    meal: Mapped[Meal] = relationship("Meal", back_populates="items")
    food_item: Mapped[FoodItem] = relationship("FoodItem")
