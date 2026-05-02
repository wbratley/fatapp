"""Service tests use a mock repository to isolate business logic."""
from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.weight_entry import WeightEntry
from app.schemas.weight_entry import WeightEntryCreate, WeightEntryUpdate
from app.services.weight_entry import WeightEntryService


def make_orm_entry(id: int, weight: float, date: datetime) -> WeightEntry:
    entry = WeightEntry()
    entry.id = id
    entry.weight = weight
    entry.date = date
    return entry


@pytest.fixture()
def repo():
    return MagicMock()


@pytest.fixture()
def service(repo):
    return WeightEntryService(repo)


D1 = datetime(2026, 1, 1)
D2 = datetime(2026, 2, 1)
D3 = datetime(2026, 3, 1)


class TestListEntries:
    def test_returns_empty_list(self, service, repo):
        repo.get_all.return_value = []
        assert service.list_entries() == []

    def test_returns_mapped_entries(self, service, repo):
        repo.get_all.return_value = [make_orm_entry(1, 80.0, D1)]
        result = service.list_entries()
        assert len(result) == 1
        assert result[0].weight == 80.0

    def test_passes_date_filters_to_repo(self, service, repo):
        repo.get_all.return_value = []
        service.list_entries(start=D1, end=D2)
        repo.get_all.assert_called_once_with(start=D1, end=D2)

    def test_raises_422_when_start_after_end(self, service, repo):
        with pytest.raises(HTTPException) as exc:
            service.list_entries(start=D3, end=D1)
        assert exc.value.status_code == 422


class TestGetEntry:
    def test_returns_entry(self, service, repo):
        repo.get_by_id.return_value = make_orm_entry(1, 75.0, D1)
        result = service.get_entry(1)
        assert result.id == 1
        assert result.weight == 75.0

    def test_raises_404_when_missing(self, service, repo):
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.get_entry(99)
        assert exc.value.status_code == 404


class TestCreateEntry:
    def test_delegates_to_repo_and_returns_response(self, service, repo):
        repo.create.return_value = make_orm_entry(1, 82.0, D1)
        payload = WeightEntryCreate(weight=82.0, date=D1)
        result = service.create_entry(payload)
        repo.create.assert_called_once_with(weight=82.0, date=D1)
        assert result.id == 1
        assert result.weight == 82.0


class TestUpdateEntry:
    def test_updates_and_returns_response(self, service, repo):
        orm_entry = make_orm_entry(1, 80.0, D1)
        repo.get_by_id.return_value = orm_entry
        repo.update.return_value = make_orm_entry(1, 85.0, D1)
        payload = WeightEntryUpdate(weight=85.0)
        result = service.update_entry(1, payload)
        repo.update.assert_called_once_with(orm_entry, weight=85.0, date=None)
        assert result.weight == 85.0

    def test_raises_404_when_missing(self, service, repo):
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.update_entry(99, WeightEntryUpdate(weight=70.0))
        assert exc.value.status_code == 404


class TestDeleteEntry:
    def test_deletes_entry(self, service, repo):
        orm_entry = make_orm_entry(1, 80.0, D1)
        repo.get_by_id.return_value = orm_entry
        service.delete_entry(1)
        repo.delete.assert_called_once_with(orm_entry)

    def test_raises_404_when_missing(self, service, repo):
        repo.get_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            service.delete_entry(99)
        assert exc.value.status_code == 404
