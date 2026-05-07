from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.food_item import FoodItemRepository
from app.repositories.meal import MealItemRepository, MealRepository
from app.schemas.meal import MealCreate, MealItemCreate, MealItemUpdate, MealResponse, MealUpdate
from app.services.meal import MealService

router = APIRouter(prefix="/meals", tags=["meals"])


def get_service(db: Session = Depends(get_db)) -> MealService:
    return MealService(MealRepository(db), MealItemRepository(db), FoodItemRepository(db))


@router.get("/", response_model=list[MealResponse])
def list_meals(
    include_deleted: bool = False,
    service: MealService = Depends(get_service),
) -> list[MealResponse]:
    return service.list_meals(include_deleted=include_deleted)


@router.get("/{meal_id}", response_model=MealResponse)
def get_meal(meal_id: int, service: MealService = Depends(get_service)) -> MealResponse:
    return service.get_meal(meal_id)


@router.post("/", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
def create_meal(
    payload: MealCreate, service: MealService = Depends(get_service)
) -> MealResponse:
    return service.create_meal(payload)


@router.patch("/{meal_id}", response_model=MealResponse)
def update_meal(
    meal_id: int,
    payload: MealUpdate,
    service: MealService = Depends(get_service),
) -> MealResponse:
    return service.update_meal(meal_id, payload)


@router.delete("/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: int, service: MealService = Depends(get_service)) -> None:
    service.delete_meal(meal_id)


@router.post("/{meal_id}/items", response_model=MealResponse)
def add_item(
    meal_id: int,
    payload: MealItemCreate,
    service: MealService = Depends(get_service),
) -> MealResponse:
    return service.add_item(meal_id, payload)


@router.patch("/{meal_id}/items/{item_id}", response_model=MealResponse)
def update_item(
    meal_id: int,
    item_id: int,
    payload: MealItemUpdate,
    service: MealService = Depends(get_service),
) -> MealResponse:
    return service.update_item(meal_id, item_id, payload)


@router.delete("/{meal_id}/items/{item_id}", response_model=MealResponse)
def remove_item(
    meal_id: int,
    item_id: int,
    service: MealService = Depends(get_service),
) -> MealResponse:
    return service.remove_item(meal_id, item_id)
