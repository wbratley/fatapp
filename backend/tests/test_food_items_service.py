"""Service tests for FoodItemService using a mocked repository."""
from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.food_item import FoodItem
from app.schemas.food_item import FoodItemCreate, FoodItemUpdate
from app.services.food_item import FoodItemService


def make_food_item(
    id: int,
    name: str,
    calories: float,
    barcode: str | None = None,
    deleted_at: datetime | None = None,
) -> FoodItem:
    item = FoodItem()
    item.id = id
    item.name = name
    item.barcode = barcode
    item.calories_per_100g = calories
    item.deleted_at = deleted_at
    return item


@pytest.fixture()
def repo() -> MagicMock:
    return MagicMock()


@pytest.fixture()
def service(repo: MagicMock) -> FoodItemService:
    return FoodItemService(repo)


class TestListFoodItems:
    def test_returns_empty_list(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_all.return_value = []
        assert service.list_food_items() == []

    def test_returns_mapped_items(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_all.return_value = [make_food_item(1, "Apple", 52.0)]
        result = service.list_food_items()
        assert len(result) == 1
        assert result[0].name == "Apple"

    def test_passes_include_deleted_flag(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_all.return_value = []
        service.list_food_items(include_deleted=True)
        repo.get_all.assert_called_once_with(include_deleted=True)


class TestGetFoodItem:
    def test_returns_item(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_by_id.return_value = make_food_item(1, "Apple", 52.0)
        result = service.get_food_item(1)
        assert result.id == 1
        assert result.name == "Apple"

    def test_raises_404_when_missing(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.get_food_item(99)
        assert exc.value.status_code == 404


class TestCreateFoodItem:
    def test_creates_item(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_by_barcode.return_value = None
        repo.create.return_value = make_food_item(1, "Apple", 52.0)
        result = service.create_food_item(FoodItemCreate(name="Apple", calories_per_100g=52.0))
        assert result.id == 1

    def test_raises_409_on_duplicate_barcode(
        self, service: FoodItemService, repo: MagicMock
    ) -> None:
        repo.get_by_barcode.return_value = make_food_item(99, "Other", 100.0, barcode="DUP")
        with pytest.raises(HTTPException) as exc:
            service.create_food_item(
                FoodItemCreate(name="New", calories_per_100g=100.0, barcode="DUP")
            )
        assert exc.value.status_code == 409

    def test_skips_barcode_check_when_no_barcode(
        self, service: FoodItemService, repo: MagicMock
    ) -> None:
        repo.create.return_value = make_food_item(1, "Apple", 52.0)
        service.create_food_item(FoodItemCreate(name="Apple", calories_per_100g=52.0))
        repo.get_by_barcode.assert_not_called()


class TestUpdateFoodItem:
    def test_updates_item(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_by_id.return_value = make_food_item(1, "Apple", 52.0)
        repo.get_by_barcode.return_value = None
        repo.update.return_value = make_food_item(1, "Updated", 55.0)
        result = service.update_food_item(1, FoodItemUpdate(name="Updated", calories_per_100g=55.0))
        assert result.name == "Updated"

    def test_raises_404_when_missing(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.update_food_item(99, FoodItemUpdate(name="X"))
        assert exc.value.status_code == 404

    def test_raises_409_on_barcode_conflict_with_different_item(
        self, service: FoodItemService, repo: MagicMock
    ) -> None:
        repo.get_by_id.return_value = make_food_item(1, "Apple", 52.0)
        repo.get_by_barcode.return_value = make_food_item(2, "Other", 100.0, barcode="DUP")
        with pytest.raises(HTTPException) as exc:
            service.update_food_item(1, FoodItemUpdate(barcode="DUP"))
        assert exc.value.status_code == 409

    def test_allows_same_barcode_on_same_item(
        self, service: FoodItemService, repo: MagicMock
    ) -> None:
        item = make_food_item(1, "Apple", 52.0, barcode="SAME")
        repo.get_by_id.return_value = item
        repo.get_by_barcode.return_value = item
        repo.update.return_value = item
        service.update_food_item(1, FoodItemUpdate(barcode="SAME"))


class TestDeleteFoodItem:
    def test_soft_deletes_item(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_by_id.return_value = make_food_item(1, "Apple", 52.0)
        service.delete_food_item(1)
        repo.soft_delete.assert_called_once()

    def test_raises_404_when_missing(self, service: FoodItemService, repo: MagicMock) -> None:
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.delete_food_item(99)
        assert exc.value.status_code == 404

    def test_raises_422_when_already_deleted(
        self, service: FoodItemService, repo: MagicMock
    ) -> None:
        repo.get_by_id.return_value = make_food_item(
            1, "Apple", 52.0, deleted_at=datetime(2026, 1, 1)
        )
        with pytest.raises(HTTPException) as exc:
            service.delete_food_item(1)
        assert exc.value.status_code == 422
