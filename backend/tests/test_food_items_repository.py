import pytest
from sqlalchemy.orm import Session

from app.repositories.food_item import FoodItemRepository


@pytest.fixture()
def repo(db: Session) -> FoodItemRepository:
    return FoodItemRepository(db)


class TestGetAll:
    def test_empty(self, repo: FoodItemRepository) -> None:
        assert repo.get_all() == []

    def test_returns_active_items(self, repo: FoodItemRepository) -> None:
        repo.create("Apple", None, 52.0)
        repo.create("Banana", "123", 89.0)
        assert len(repo.get_all()) == 2

    def test_excludes_deleted_by_default(self, repo: FoodItemRepository) -> None:
        item = repo.create("Apple", None, 52.0)
        repo.soft_delete(item)
        assert repo.get_all() == []

    def test_includes_deleted_when_flagged(self, repo: FoodItemRepository) -> None:
        item = repo.create("Apple", None, 52.0)
        repo.soft_delete(item)
        assert len(repo.get_all(include_deleted=True)) == 1

    def test_ordered_by_name(self, repo: FoodItemRepository) -> None:
        repo.create("Zebra", None, 100.0)
        repo.create("Apple", None, 50.0)
        items = repo.get_all()
        assert [i.name for i in items] == ["Apple", "Zebra"]


class TestGetById:
    def test_returns_item(self, repo: FoodItemRepository) -> None:
        created = repo.create("Apple", None, 52.0)
        fetched = repo.get_by_id(created.id)
        assert fetched is not None
        assert fetched.name == "Apple"

    def test_returns_soft_deleted_item(self, repo: FoodItemRepository) -> None:
        item = repo.create("Apple", None, 52.0)
        repo.soft_delete(item)
        assert repo.get_by_id(item.id) is not None

    def test_returns_none_for_missing(self, repo: FoodItemRepository) -> None:
        assert repo.get_by_id(9999) is None


class TestGetByBarcode:
    def test_finds_by_barcode(self, repo: FoodItemRepository) -> None:
        repo.create("Apple", "ABC", 52.0)
        found = repo.get_by_barcode("ABC")
        assert found is not None
        assert found.name == "Apple"

    def test_returns_none_for_unknown_barcode(self, repo: FoodItemRepository) -> None:
        assert repo.get_by_barcode("NOPE") is None


class TestCreate:
    def test_persists_item(self, repo: FoodItemRepository) -> None:
        item = repo.create("Oats", "XYZ", 389.0)
        assert item.id is not None
        assert item.name == "Oats"
        assert item.barcode == "XYZ"
        assert item.calories_per_100g == 389.0
        assert item.deleted_at is None

    def test_create_without_barcode(self, repo: FoodItemRepository) -> None:
        item = repo.create("Custom", None, 200.0)
        assert item.barcode is None

    def test_created_item_is_retrievable(self, repo: FoodItemRepository) -> None:
        item = repo.create("Apple", None, 52.0)
        assert repo.get_by_id(item.id) is not None


class TestUpdate:
    def test_update_name(self, repo: FoodItemRepository) -> None:
        item = repo.create("Old", None, 100.0)
        updated = repo.update(item, name="New", barcode=None, calories_per_100g=None)
        assert updated.name == "New"
        assert updated.calories_per_100g == 100.0

    def test_update_calories(self, repo: FoodItemRepository) -> None:
        item = repo.create("Item", None, 100.0)
        updated = repo.update(item, name=None, barcode=None, calories_per_100g=150.0)
        assert updated.calories_per_100g == 150.0
        assert updated.name == "Item"

    def test_update_barcode(self, repo: FoodItemRepository) -> None:
        item = repo.create("Item", None, 100.0)
        updated = repo.update(item, name=None, barcode="NEW", calories_per_100g=None)
        assert updated.barcode == "NEW"

    def test_update_nothing_leaves_unchanged(self, repo: FoodItemRepository) -> None:
        item = repo.create("Item", "BAR", 100.0)
        updated = repo.update(item, name=None, barcode=None, calories_per_100g=None)
        assert updated.name == "Item"
        assert updated.barcode == "BAR"
        assert updated.calories_per_100g == 100.0


class TestSoftDelete:
    def test_sets_deleted_at(self, repo: FoodItemRepository) -> None:
        item = repo.create("Item", None, 100.0)
        repo.soft_delete(item)
        fetched = repo.get_by_id(item.id)
        assert fetched is not None
        assert fetched.deleted_at is not None

    def test_soft_deleted_item_excluded_from_default_list(self, repo: FoodItemRepository) -> None:
        item = repo.create("Item", None, 100.0)
        repo.soft_delete(item)
        assert repo.get_all() == []

    def test_only_deletes_target(self, repo: FoodItemRepository) -> None:
        a = repo.create("A", None, 100.0)
        b = repo.create("B", None, 200.0)
        repo.soft_delete(a)
        assert repo.get_by_id(b.id) is not None
        assert repo.get_by_id(b.id) is not None
        items = repo.get_all()
        assert len(items) == 1
        assert items[0].name == "B"
