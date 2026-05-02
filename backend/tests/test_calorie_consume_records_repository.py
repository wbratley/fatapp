from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.repositories.calorie_consume_record import CalorieConsumeRecordRepository
from app.repositories.food_item import FoodItemRepository


@pytest.fixture()
def food_repo(db: Session) -> FoodItemRepository:
    return FoodItemRepository(db)


@pytest.fixture()
def repo(db: Session) -> CalorieConsumeRecordRepository:
    return CalorieConsumeRecordRepository(db)


@pytest.fixture()
def food_item(food_repo: FoodItemRepository):  # type: ignore[no-untyped-def]
    return food_repo.create("Apple", None, 52.0)


D1 = datetime(2026, 1, 1, 8, 0)
D2 = datetime(2026, 2, 1, 8, 0)
D3 = datetime(2026, 3, 1, 8, 0)


class TestGetAll:
    def test_empty(self, repo: CalorieConsumeRecordRepository) -> None:
        assert repo.get_all() == []

    def test_returns_records_ordered_by_timestamp(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        repo.create(food_item.id, 200.0, D3, 104.0)
        repo.create(food_item.id, 100.0, D1, 52.0)
        records = repo.get_all()
        assert [r.timestamp for r in records] == [D1, D3]

    def test_filter_start(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        repo.create(food_item.id, 100.0, D1, 52.0)
        repo.create(food_item.id, 200.0, D3, 104.0)
        records = repo.get_all(start=D2)
        assert len(records) == 1
        assert records[0].timestamp == D3

    def test_filter_end(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        repo.create(food_item.id, 100.0, D1, 52.0)
        repo.create(food_item.id, 200.0, D3, 104.0)
        records = repo.get_all(end=D2)
        assert len(records) == 1
        assert records[0].timestamp == D1

    def test_food_item_name_accessible(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        repo.create(food_item.id, 100.0, D1, 52.0)
        records = repo.get_all()
        assert records[0].food_item.name == "Apple"


class TestGetById:
    def test_returns_record(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        created = repo.create(food_item.id, 150.0, D1, 78.0)
        fetched = repo.get_by_id(created.id)
        assert fetched is not None
        assert fetched.grams == 150.0

    def test_food_item_accessible(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        created = repo.create(food_item.id, 150.0, D1, 78.0)
        fetched = repo.get_by_id(created.id)
        assert fetched is not None
        assert fetched.food_item.name == "Apple"

    def test_returns_none_for_missing(self, repo: CalorieConsumeRecordRepository) -> None:
        assert repo.get_by_id(9999) is None


class TestCreate:
    def test_persists_record(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        record = repo.create(food_item.id, 200.0, D1, 104.0)
        assert record.id is not None
        assert record.food_item_id == food_item.id
        assert record.grams == 200.0
        assert record.timestamp == D1
        assert record.total_calories == 104.0

    def test_created_record_is_retrievable(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        record = repo.create(food_item.id, 100.0, D1, 52.0)
        assert repo.get_by_id(record.id) is not None


class TestUpdate:
    def test_update_grams_and_calories(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        record = repo.create(food_item.id, 100.0, D1, 52.0)
        updated = repo.update(record, grams=200.0, timestamp=None, total_calories=104.0)
        assert updated.grams == 200.0
        assert updated.total_calories == 104.0
        assert updated.timestamp == D1

    def test_update_timestamp(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        record = repo.create(food_item.id, 100.0, D1, 52.0)
        updated = repo.update(record, grams=None, timestamp=D2, total_calories=None)
        assert updated.timestamp == D2
        assert updated.grams == 100.0
        assert updated.total_calories == 52.0

    def test_update_nothing_leaves_unchanged(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        record = repo.create(food_item.id, 100.0, D1, 52.0)
        updated = repo.update(record, grams=None, timestamp=None, total_calories=None)
        assert updated.grams == 100.0
        assert updated.timestamp == D1
        assert updated.total_calories == 52.0


class TestDelete:
    def test_removes_record(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        record = repo.create(food_item.id, 100.0, D1, 52.0)
        record_id = record.id
        repo.delete(record)
        assert repo.get_by_id(record_id) is None

    def test_only_deletes_target(self, repo, food_item) -> None:  # type: ignore[no-untyped-def]
        a = repo.create(food_item.id, 100.0, D1, 52.0)
        b = repo.create(food_item.id, 200.0, D2, 104.0)
        repo.delete(a)
        assert repo.get_by_id(b.id) is not None
