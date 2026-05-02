"""Service tests for CalorieConsumeRecordService using mocked repositories."""
from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.calorie_consume_record import CalorieConsumeRecord
from app.models.food_item import FoodItem
from app.schemas.calorie_consume_record import (
    CalorieConsumeRecordCreate,
    CalorieConsumeRecordUpdate,
)
from app.services.calorie_consume_record import CalorieConsumeRecordService


def make_food_item(
    id: int,
    name: str,
    calories: float,
    deleted_at: datetime | None = None,
) -> FoodItem:
    item = FoodItem()
    item.id = id
    item.name = name
    item.calories_per_100g = calories
    item.deleted_at = deleted_at
    return item


def make_record(
    id: int,
    food_item: FoodItem,
    grams: float,
    timestamp: datetime,
    total_calories: float,
) -> CalorieConsumeRecord:
    record = CalorieConsumeRecord()
    record.id = id
    record.food_item_id = food_item.id
    record.food_item = food_item
    record.grams = grams
    record.timestamp = timestamp
    record.total_calories = total_calories
    return record


@pytest.fixture()
def repo() -> MagicMock:
    return MagicMock()


@pytest.fixture()
def food_repo() -> MagicMock:
    return MagicMock()


@pytest.fixture()
def service(repo: MagicMock, food_repo: MagicMock) -> CalorieConsumeRecordService:
    return CalorieConsumeRecordService(repo, food_repo)


D1 = datetime(2026, 1, 1, 8, 0)
D2 = datetime(2026, 2, 1, 8, 0)


class TestListRecords:
    def test_returns_empty(self, service: CalorieConsumeRecordService, repo: MagicMock) -> None:
        repo.get_all.return_value = []
        assert service.list_records() == []

    def test_returns_mapped_records(
        self, service: CalorieConsumeRecordService, repo: MagicMock
    ) -> None:
        food = make_food_item(1, "Apple", 52.0)
        repo.get_all.return_value = [make_record(1, food, 200.0, D1, 104.0)]
        result = service.list_records()
        assert len(result) == 1
        assert result[0].food_item_name == "Apple"
        assert result[0].total_calories == 104.0

    def test_raises_422_when_start_after_end(
        self, service: CalorieConsumeRecordService
    ) -> None:
        with pytest.raises(HTTPException) as exc:
            service.list_records(start=D2, end=D1)
        assert exc.value.status_code == 422


class TestGetRecord:
    def test_returns_record(
        self, service: CalorieConsumeRecordService, repo: MagicMock
    ) -> None:
        food = make_food_item(1, "Apple", 52.0)
        repo.get_by_id.return_value = make_record(1, food, 200.0, D1, 104.0)
        result = service.get_record(1)
        assert result.id == 1
        assert result.food_item_name == "Apple"

    def test_raises_404_when_missing(
        self, service: CalorieConsumeRecordService, repo: MagicMock
    ) -> None:
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.get_record(99)
        assert exc.value.status_code == 404


class TestCreateRecord:
    def test_calculates_total_calories(
        self,
        service: CalorieConsumeRecordService,
        repo: MagicMock,
        food_repo: MagicMock,
    ) -> None:
        food = make_food_item(1, "Apple", 52.0)
        food_repo.get_by_id.return_value = food
        repo.create.return_value = make_record(1, food, 200.0, D1, 104.0)

        result = service.create_record(
            CalorieConsumeRecordCreate(food_item_id=1, grams=200.0, timestamp=D1)
        )
        repo.create.assert_called_once_with(
            food_item_id=1, grams=200.0, timestamp=D1, total_calories=104.0
        )
        assert result.total_calories == 104.0

    def test_raises_404_when_food_item_missing(
        self, service: CalorieConsumeRecordService, food_repo: MagicMock
    ) -> None:
        food_repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.create_record(
                CalorieConsumeRecordCreate(food_item_id=99, grams=100.0, timestamp=D1)
            )
        assert exc.value.status_code == 404

    def test_raises_422_when_food_item_deleted(
        self, service: CalorieConsumeRecordService, food_repo: MagicMock
    ) -> None:
        food_repo.get_by_id.return_value = make_food_item(
            1, "Apple", 52.0, deleted_at=datetime(2026, 1, 1)
        )
        with pytest.raises(HTTPException) as exc:
            service.create_record(
                CalorieConsumeRecordCreate(food_item_id=1, grams=100.0, timestamp=D1)
            )
        assert exc.value.status_code == 422


class TestUpdateRecord:
    def test_recalculates_calories_when_grams_change(
        self,
        service: CalorieConsumeRecordService,
        repo: MagicMock,
        food_repo: MagicMock,
    ) -> None:
        food = make_food_item(1, "Apple", 52.0)
        original = make_record(1, food, 100.0, D1, 52.0)
        updated_record = make_record(1, food, 200.0, D1, 104.0)
        repo.get_by_id.return_value = original
        food_repo.get_by_id.return_value = food
        repo.update.return_value = updated_record

        result = service.update_record(1, CalorieConsumeRecordUpdate(grams=200.0))
        repo.update.assert_called_once_with(
            original, grams=200.0, timestamp=None, total_calories=104.0
        )
        assert result.total_calories == 104.0

    def test_preserves_calories_when_only_timestamp_changes(
        self,
        service: CalorieConsumeRecordService,
        repo: MagicMock,
        food_repo: MagicMock,
    ) -> None:
        food = make_food_item(1, "Apple", 52.0)
        original = make_record(1, food, 100.0, D1, 52.0)
        repo.get_by_id.return_value = original
        repo.update.return_value = make_record(1, food, 100.0, D2, 52.0)

        service.update_record(1, CalorieConsumeRecordUpdate(timestamp=D2))
        repo.update.assert_called_once_with(original, grams=None, timestamp=D2, total_calories=None)
        food_repo.get_by_id.assert_not_called()

    def test_raises_404_when_missing(
        self, service: CalorieConsumeRecordService, repo: MagicMock
    ) -> None:
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.update_record(99, CalorieConsumeRecordUpdate(grams=100.0))
        assert exc.value.status_code == 404


class TestDeleteRecord:
    def test_deletes_record(
        self, service: CalorieConsumeRecordService, repo: MagicMock
    ) -> None:
        food = make_food_item(1, "Apple", 52.0)
        record = make_record(1, food, 100.0, D1, 52.0)
        repo.get_by_id.return_value = record
        service.delete_record(1)
        repo.delete.assert_called_once_with(record)

    def test_raises_404_when_missing(
        self, service: CalorieConsumeRecordService, repo: MagicMock
    ) -> None:
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.delete_record(99)
        assert exc.value.status_code == 404
