from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FoodItem(Base):
    __tablename__ = "food_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    barcode: Mapped[str | None] = mapped_column(String, unique=True, nullable=True, index=True)
    calories_per_100g: Mapped[float] = mapped_column(Float, nullable=False)
    portion_size_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    portion_label: Mapped[str | None] = mapped_column(String, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
