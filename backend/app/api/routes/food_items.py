from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.clients.open_food_facts import OpenFoodFactsClient
from app.database import get_db
from app.repositories.food_item import FoodItemRepository
from app.schemas.food_item import (
    BarcodeLookupResponse,
    FoodItemCreate,
    FoodItemRefreshResponse,
    FoodItemResponse,
    FoodItemUpdate,
)
from app.services.food_item import FoodItemService

router = APIRouter(prefix="/food-items", tags=["food-items"])


def get_service(db: Session = Depends(get_db)) -> FoodItemService:
    return FoodItemService(FoodItemRepository(db))


@router.get("/", response_model=list[FoodItemResponse])
def list_food_items(
    include_deleted: bool = False,
    service: FoodItemService = Depends(get_service),
) -> list[FoodItemResponse]:
    return service.list_food_items(include_deleted=include_deleted)


@router.get("/{item_id}", response_model=FoodItemResponse)
def get_food_item(
    item_id: int, service: FoodItemService = Depends(get_service)
) -> FoodItemResponse:
    return service.get_food_item(item_id)


@router.post("/", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
def create_food_item(
    payload: FoodItemCreate, service: FoodItemService = Depends(get_service)
) -> FoodItemResponse:
    return service.create_food_item(payload)


@router.patch("/{item_id}", response_model=FoodItemResponse)
def update_food_item(
    item_id: int,
    payload: FoodItemUpdate,
    service: FoodItemService = Depends(get_service),
) -> FoodItemResponse:
    return service.update_food_item(item_id, payload)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_item(
    item_id: int, service: FoodItemService = Depends(get_service)
) -> None:
    service.delete_food_item(item_id)


@router.post("/{item_id}/refresh", response_model=FoodItemRefreshResponse)
def refresh_food_item(
    item_id: int,
    service: FoodItemService = Depends(get_service),
    off_client: OpenFoodFactsClient = Depends(OpenFoodFactsClient),
) -> FoodItemRefreshResponse:
    return service.refresh_food_item(item_id, off_client)


@router.post("/barcode/{barcode}", response_model=BarcodeLookupResponse)
def add_by_barcode(
    barcode: str,
    service: FoodItemService = Depends(get_service),
    off_client: OpenFoodFactsClient = Depends(OpenFoodFactsClient),
) -> BarcodeLookupResponse:
    return service.add_by_barcode(barcode, off_client)
