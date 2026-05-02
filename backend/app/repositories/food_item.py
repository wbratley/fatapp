from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.food_item import FoodItem


class FoodItemRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_all(self, include_deleted: bool = False) -> list[FoodItem]:
        stmt = select(FoodItem)
        if not include_deleted:
            stmt = stmt.where(FoodItem.deleted_at.is_(None))
        stmt = stmt.order_by(FoodItem.name)
        return list(self._db.scalars(stmt).all())

    def get_by_id(self, item_id: int) -> FoodItem | None:
        return self._db.get(FoodItem, item_id)

    def get_by_barcode(self, barcode: str) -> FoodItem | None:
        stmt = select(FoodItem).where(FoodItem.barcode == barcode)
        return self._db.scalars(stmt).first()

    def create(self, name: str, barcode: str | None, calories_per_100g: float) -> FoodItem:
        item = FoodItem(name=name, barcode=barcode, calories_per_100g=calories_per_100g)
        self._db.add(item)
        self._db.commit()
        self._db.refresh(item)
        return item

    def update(
        self,
        item: FoodItem,
        name: str | None,
        barcode: str | None,
        calories_per_100g: float | None,
    ) -> FoodItem:
        if name is not None:
            item.name = name
        if barcode is not None:
            item.barcode = barcode
        if calories_per_100g is not None:
            item.calories_per_100g = calories_per_100g
        self._db.commit()
        self._db.refresh(item)
        return item

    def soft_delete(self, item: FoodItem) -> None:
        item.deleted_at = datetime.now(UTC).replace(tzinfo=None)
        self._db.commit()
