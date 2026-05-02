from datetime import datetime

from fastapi import HTTPException, status

from app.models.calorie_consume_record import CalorieConsumeRecord
from app.repositories.calorie_consume_record import CalorieConsumeRecordRepository
from app.repositories.food_item import FoodItemRepository
from app.schemas.calorie_consume_record import (
    CalorieConsumeRecordCreate,
    CalorieConsumeRecordResponse,
    CalorieConsumeRecordUpdate,
)


class CalorieConsumeRecordService:
    def __init__(
        self,
        repo: CalorieConsumeRecordRepository,
        food_item_repo: FoodItemRepository,
    ) -> None:
        self._repo = repo
        self._food_item_repo = food_item_repo

    def _to_response(self, record: CalorieConsumeRecord) -> CalorieConsumeRecordResponse:
        return CalorieConsumeRecordResponse(
            id=record.id,
            food_item_id=record.food_item_id,
            food_item_name=record.food_item.name,
            grams=record.grams,
            timestamp=record.timestamp,
            total_calories=record.total_calories,
        )

    def list_records(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> list[CalorieConsumeRecordResponse]:
        if start and end and start > end:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="start must be before end",
            )
        return [self._to_response(r) for r in self._repo.get_all(start=start, end=end)]

    def get_record(self, record_id: int) -> CalorieConsumeRecordResponse:
        record = self._repo.get_by_id(record_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Calorie record not found"
            )
        return self._to_response(record)

    def create_record(self, payload: CalorieConsumeRecordCreate) -> CalorieConsumeRecordResponse:
        food_item = self._food_item_repo.get_by_id(payload.food_item_id)
        if food_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found"
            )
        if food_item.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot log against a deleted food item",
            )
        total_calories = round(payload.grams * food_item.calories_per_100g / 100, 2)
        record = self._repo.create(
            food_item_id=payload.food_item_id,
            grams=payload.grams,
            timestamp=payload.timestamp,
            total_calories=total_calories,
        )
        return CalorieConsumeRecordResponse(
            id=record.id,
            food_item_id=record.food_item_id,
            food_item_name=food_item.name,
            grams=record.grams,
            timestamp=record.timestamp,
            total_calories=record.total_calories,
        )

    def update_record(
        self, record_id: int, payload: CalorieConsumeRecordUpdate
    ) -> CalorieConsumeRecordResponse:
        record = self._repo.get_by_id(record_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Calorie record not found"
            )
        new_total_calories: float | None = None
        if payload.grams is not None:
            food_item = self._food_item_repo.get_by_id(record.food_item_id)
            if food_item is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found"
                )
            new_total_calories = round(payload.grams * food_item.calories_per_100g / 100, 2)
        record = self._repo.update(
            record,
            grams=payload.grams,
            timestamp=payload.timestamp,
            total_calories=new_total_calories,
        )
        return self._to_response(record)

    def delete_record(self, record_id: int) -> None:
        record = self._repo.get_by_id(record_id)
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Calorie record not found"
            )
        self._repo.delete(record)
