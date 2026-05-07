from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.meal import Meal, MealItem


class MealRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def _base_query(self) -> object:
        return select(Meal).options(
            joinedload(Meal.items).joinedload(MealItem.food_item)
        )

    def get_all(self, include_deleted: bool = False) -> list[Meal]:
        stmt = self._base_query().order_by(Meal.name)
        if not include_deleted:
            stmt = stmt.where(Meal.deleted_at.is_(None))
        return list(self._db.scalars(stmt).unique().all())

    def get_by_id(self, meal_id: int) -> Meal | None:
        stmt = self._base_query().where(Meal.id == meal_id)
        return self._db.scalars(stmt).unique().first()

    def create(self, name: str, total_calories: float) -> Meal:
        meal = Meal(name=name, total_calories=total_calories)
        self._db.add(meal)
        self._db.commit()
        self._db.refresh(meal)
        return meal

    def update(self, meal: Meal, name: str | None, total_calories: float | None) -> Meal:
        if name is not None:
            meal.name = name
        if total_calories is not None:
            meal.total_calories = total_calories
        self._db.commit()
        self._db.refresh(meal)
        return meal

    def soft_delete(self, meal: Meal) -> None:
        meal.deleted_at = datetime.now(UTC).replace(tzinfo=None)
        self._db.commit()


class MealItemRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_id(self, item_id: int) -> MealItem | None:
        return self._db.get(MealItem, item_id)

    def create(
        self, meal_id: int, food_item_id: int, grams: float, calories: float
    ) -> MealItem:
        item = MealItem(
            meal_id=meal_id, food_item_id=food_item_id, grams=grams, calories=calories
        )
        self._db.add(item)
        self._db.commit()
        self._db.refresh(item)
        return item

    def update(self, item: MealItem, grams: float, calories: float) -> MealItem:
        item.grams = grams
        item.calories = calories
        self._db.commit()
        self._db.refresh(item)
        return item

    def delete(self, item: MealItem) -> None:
        self._db.delete(item)
        self._db.commit()
