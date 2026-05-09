from fastapi import HTTPException, status

from app.clients.open_food_facts import OpenFoodFactsClient
from app.repositories.food_item import FoodItemRepository
from app.schemas.food_item import (
    BarcodeLookupResponse,
    FoodItemCreate,
    FoodItemRefreshResponse,
    FoodItemResponse,
    FoodItemUpdate,
)


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
            portion_size_g=payload.portion_size_g,
            portion_label=payload.portion_label,
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
        update_portions = bool({'portion_size_g', 'portion_label'} & payload.model_fields_set)
        item = self._repo.update(
            item,
            name=payload.name,
            barcode=payload.barcode,
            calories_per_100g=payload.calories_per_100g,
            portion_size_g=payload.portion_size_g,
            portion_label=payload.portion_label,
            update_portions=update_portions,
        )
        return FoodItemResponse.model_validate(item)

    def add_by_barcode(self, barcode: str, client: OpenFoodFactsClient) -> BarcodeLookupResponse:
        existing = self._repo.get_by_barcode(barcode)
        if existing is not None:
            return BarcodeLookupResponse(
                found=True, food_item=FoodItemResponse.model_validate(existing)
            )
        product = client.lookup(barcode)
        if product is None:
            return BarcodeLookupResponse(found=False)
        item = self._repo.create(
            name=product.name,
            barcode=barcode,
            calories_per_100g=product.calories_per_100g,
        )
        return BarcodeLookupResponse(found=True, food_item=FoodItemResponse.model_validate(item))

    def refresh_food_item(self, item_id: int, client: OpenFoodFactsClient) -> FoodItemRefreshResponse:
        item = self._repo.get_by_id(item_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")
        if item.barcode is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Food item has no barcode")

        product = client.lookup(item.barcode)
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Barcode not found on Open Food Facts")

        changes: list[str] = []
        new_portion_size = item.portion_size_g
        new_portion_label = item.portion_label
        update_portions = False

        if round(product.calories_per_100g, 2) != round(item.calories_per_100g, 2):
            changes.append(f"calories updated {item.calories_per_100g} → {product.calories_per_100g} kcal/100g")

        if product.serving_quantity is not None:
            # Use existing label if set, otherwise fall back to what OFF gives us
            candidate_label = item.portion_label or product.serving_label
            # Only update portions if we end up with a complete pair
            if candidate_label is not None:
                if product.serving_quantity != item.portion_size_g:
                    new_portion_size = product.serving_quantity
                    update_portions = True
                    if item.portion_size_g is None:
                        changes.append(f"portion size set to {product.serving_quantity}g")
                    else:
                        changes.append(f"portion size updated {item.portion_size_g} → {product.serving_quantity}g")
                if candidate_label != item.portion_label:
                    new_portion_label = candidate_label
                    update_portions = True
                    changes.append(f"portion label set to \"{candidate_label}\"")

        item = self._repo.update(
            item,
            name=None,
            barcode=None,
            calories_per_100g=product.calories_per_100g,
            portion_size_g=new_portion_size,
            portion_label=new_portion_label,
            update_portions=update_portions,
        )
        return FoodItemRefreshResponse(
            food_item=FoodItemResponse.model_validate(item),
            changes=changes,
        )

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
