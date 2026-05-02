from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.calorie_consume_record import CalorieConsumeRecordRepository
from app.repositories.food_item import FoodItemRepository
from app.schemas.calorie_consume_record import (
    CalorieConsumeRecordCreate,
    CalorieConsumeRecordResponse,
    CalorieConsumeRecordUpdate,
)
from app.services.calorie_consume_record import CalorieConsumeRecordService

router = APIRouter(prefix="/calorie-consume-records", tags=["calorie-consume-records"])


def get_service(db: Session = Depends(get_db)) -> CalorieConsumeRecordService:
    return CalorieConsumeRecordService(
        CalorieConsumeRecordRepository(db),
        FoodItemRepository(db),
    )


@router.get("/", response_model=list[CalorieConsumeRecordResponse])
def list_records(
    start: datetime | None = None,
    end: datetime | None = None,
    service: CalorieConsumeRecordService = Depends(get_service),
) -> list[CalorieConsumeRecordResponse]:
    return service.list_records(start=start, end=end)


@router.get("/{record_id}", response_model=CalorieConsumeRecordResponse)
def get_record(
    record_id: int, service: CalorieConsumeRecordService = Depends(get_service)
) -> CalorieConsumeRecordResponse:
    return service.get_record(record_id)


@router.post("/", response_model=CalorieConsumeRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: CalorieConsumeRecordCreate,
    service: CalorieConsumeRecordService = Depends(get_service),
) -> CalorieConsumeRecordResponse:
    return service.create_record(payload)


@router.patch("/{record_id}", response_model=CalorieConsumeRecordResponse)
def update_record(
    record_id: int,
    payload: CalorieConsumeRecordUpdate,
    service: CalorieConsumeRecordService = Depends(get_service),
) -> CalorieConsumeRecordResponse:
    return service.update_record(record_id, payload)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: int, service: CalorieConsumeRecordService = Depends(get_service)
) -> None:
    service.delete_record(record_id)
