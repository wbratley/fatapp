from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.food_item import FoodItem


class CalorieConsumeRecord(Base):
    __tablename__ = "calorie_consume_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    food_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("food_items.id"), nullable=False, index=True
    )
    grams: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    total_calories: Mapped[float] = mapped_column(Float, nullable=False)

    food_item: Mapped[FoodItem] = relationship("FoodItem")
