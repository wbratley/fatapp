from fastapi import HTTPException, status

from app.models.meal import Meal, MealItem
from app.repositories.food_item import FoodItemRepository
from app.repositories.meal import MealItemRepository, MealRepository
from app.schemas.meal import (
    MealCreate,
    MealItemCreate,
    MealItemResponse,
    MealItemUpdate,
    MealResponse,
    MealUpdate,
)


class MealService:
    def __init__(
        self,
        repo: MealRepository,
        item_repo: MealItemRepository,
        food_item_repo: FoodItemRepository,
    ) -> None:
        self._repo = repo
        self._item_repo = item_repo
        self._food_item_repo = food_item_repo

    def _item_to_response(self, item: MealItem) -> MealItemResponse:
        return MealItemResponse(
            id=item.id,
            meal_id=item.meal_id,
            food_item_id=item.food_item_id,
            food_item_name=item.food_item.name,
            grams=item.grams,
            calories=item.calories,
        )

    def _to_response(self, meal: Meal) -> MealResponse:
        return MealResponse(
            id=meal.id,
            name=meal.name,
            total_calories=meal.total_calories,
            deleted_at=meal.deleted_at,
            items=[self._item_to_response(item) for item in meal.items],
        )

    def _recalculate_total(self, meal: Meal) -> float:
        return round(sum(item.calories for item in meal.items), 2)

    def _get_or_404(self, meal_id: int) -> Meal:
        meal = self._repo.get_by_id(meal_id)
        if meal is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
        return meal

    def _validate_food_item(self, food_item_id: int):
        food_item = self._food_item_repo.get_by_id(food_item_id)
        if food_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Food item {food_item_id} not found",
            )
        if food_item.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Food item {food_item_id} is deleted",
            )
        return food_item

    def list_meals(self, include_deleted: bool = False) -> list[MealResponse]:
        return [self._to_response(m) for m in self._repo.get_all(include_deleted=include_deleted)]

    def get_meal(self, meal_id: int) -> MealResponse:
        return self._to_response(self._get_or_404(meal_id))

    def create_meal(self, payload: MealCreate) -> MealResponse:
        item_data = []
        for item_payload in payload.items:
            food_item = self._validate_food_item(item_payload.food_item_id)
            calories = round(item_payload.grams * food_item.calories_per_100g / 100, 2)
            item_data.append((item_payload, calories))

        meal = self._repo.create(name=payload.name, total_calories=0.0)
        for item_payload, calories in item_data:
            self._item_repo.create(
                meal_id=meal.id,
                food_item_id=item_payload.food_item_id,
                grams=item_payload.grams,
                calories=calories,
            )

        meal = self._repo.get_by_id(meal.id)
        self._repo.update(meal, name=None, total_calories=self._recalculate_total(meal))
        return self._to_response(self._repo.get_by_id(meal.id))

    def update_meal(self, meal_id: int, payload: MealUpdate) -> MealResponse:
        meal = self._get_or_404(meal_id)
        meal = self._repo.update(meal, name=payload.name, total_calories=None)
        return self._to_response(self._repo.get_by_id(meal.id))

    def delete_meal(self, meal_id: int) -> None:
        meal = self._get_or_404(meal_id)
        if meal.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Meal is already deleted",
            )
        self._repo.soft_delete(meal)

    def add_item(self, meal_id: int, payload: MealItemCreate) -> MealResponse:
        meal = self._get_or_404(meal_id)
        food_item = self._validate_food_item(payload.food_item_id)
        calories = round(payload.grams * food_item.calories_per_100g / 100, 2)
        self._item_repo.create(
            meal_id=meal.id,
            food_item_id=payload.food_item_id,
            grams=payload.grams,
            calories=calories,
        )
        meal = self._repo.get_by_id(meal_id)
        self._repo.update(meal, name=None, total_calories=self._recalculate_total(meal))
        return self._to_response(self._repo.get_by_id(meal_id))

    def update_item(self, meal_id: int, item_id: int, payload: MealItemUpdate) -> MealResponse:
        self._get_or_404(meal_id)
        item = self._item_repo.get_by_id(item_id)
        if item is None or item.meal_id != meal_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Meal item not found"
            )
        food_item = self._food_item_repo.get_by_id(item.food_item_id)
        calories = round(payload.grams * food_item.calories_per_100g / 100, 2)
        self._item_repo.update(item, grams=payload.grams, calories=calories)
        meal = self._repo.get_by_id(meal_id)
        self._repo.update(meal, name=None, total_calories=self._recalculate_total(meal))
        return self._to_response(self._repo.get_by_id(meal_id))

    def remove_item(self, meal_id: int, item_id: int) -> MealResponse:
        self._get_or_404(meal_id)
        item = self._item_repo.get_by_id(item_id)
        if item is None or item.meal_id != meal_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Meal item not found"
            )
        self._item_repo.delete(item)
        meal = self._repo.get_by_id(meal_id)
        self._repo.update(meal, name=None, total_calories=self._recalculate_total(meal))
        return self._to_response(self._repo.get_by_id(meal_id))
