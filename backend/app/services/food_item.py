from fastapi import HTTPException, status

from app.repositories.food_item import FoodItemRepository
from app.schemas.food_item import FoodItemCreate, FoodItemResponse, FoodItemUpdate


class FoodItemService:
    def __init__(self, repo: FoodItemRepository) -> None:
        self._repo = repo

    def list_food_items(self, include_deleted: bool = False) -> list[FoodItemResponse]:
        items = self._repo.get_all(include_deleted=include_deleted)
        return [FoodItemResponse.model_validate(i) for i in items]

    def get_food_item(self, item_id: int) -> FoodItemResponse:
        item = self._repo.get_by_id(item_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")
        return FoodItemResponse.model_validate(item)

    def create_food_item(self, payload: FoodItemCreate) -> FoodItemResponse:
        if payload.barcode is not None and self._repo.get_by_barcode(payload.barcode) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Barcode already in use"
            )
        item = self._repo.create(
            name=payload.name,
            barcode=payload.barcode,
            calories_per_100g=payload.calories_per_100g,
        )
        return FoodItemResponse.model_validate(item)

    def update_food_item(self, item_id: int, payload: FoodItemUpdate) -> FoodItemResponse:
        item = self._repo.get_by_id(item_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")
        if payload.barcode is not None:
            existing = self._repo.get_by_barcode(payload.barcode)
            if existing is not None and existing.id != item_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="Barcode already in use"
                )
        item = self._repo.update(
            item,
            name=payload.name,
            barcode=payload.barcode,
            calories_per_100g=payload.calories_per_100g,
        )
        return FoodItemResponse.model_validate(item)

    def delete_food_item(self, item_id: int) -> None:
        item = self._repo.get_by_id(item_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")
        if item.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Food item is already deleted",
            )
        self._repo.soft_delete(item)
