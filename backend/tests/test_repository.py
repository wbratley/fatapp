from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.repositories.weight_entry import WeightEntryRepository


@pytest.fixture()
def repo(db: Session) -> WeightEntryRepository:
    return WeightEntryRepository(db)


D1 = datetime(2026, 1, 1, 8, 0)
D2 = datetime(2026, 2, 1, 8, 0)
D3 = datetime(2026, 3, 1, 8, 0)


class TestGetAll:
    def test_empty(self, repo):
        assert repo.get_all() == []

    def test_returns_all_ordered_by_date(self, repo):
        repo.create(70.0, D3)
        repo.create(71.0, D1)
        repo.create(72.0, D2)
        entries = repo.get_all()
        assert [e.date for e in entries] == [D1, D2, D3]

    def test_filter_start(self, repo):
        repo.create(70.0, D1)
        repo.create(71.0, D2)
        repo.create(72.0, D3)
        entries = repo.get_all(start=D2)
        assert len(entries) == 2
        assert all(e.date >= D2 for e in entries)

    def test_filter_end(self, repo):
        repo.create(70.0, D1)
        repo.create(71.0, D2)
        repo.create(72.0, D3)
        entries = repo.get_all(end=D2)
        assert len(entries) == 2
        assert all(e.date <= D2 for e in entries)

    def test_filter_start_and_end(self, repo):
        repo.create(70.0, D1)
        repo.create(71.0, D2)
        repo.create(72.0, D3)
        entries = repo.get_all(start=D2, end=D2)
        assert len(entries) == 1
        assert entries[0].date == D2

    def test_filter_range_with_no_matches(self, repo):
        repo.create(70.0, D1)
        repo.create(71.0, D3)
        entries = repo.get_all(start=D2, end=D2)
        assert entries == []


class TestGetById:
    def test_returns_entry(self, repo):
        created = repo.create(80.0, D1)
        fetched = repo.get_by_id(created.id)
        assert fetched is not None
        assert fetched.id == created.id
        assert fetched.weight == 80.0

    def test_returns_none_for_missing(self, repo):
        assert repo.get_by_id(9999) is None


class TestCreate:
    def test_persists_entry(self, repo):
        entry = repo.create(75.5, D1)
        assert entry.id is not None
        assert entry.weight == 75.5
        assert entry.date == D1

    def test_created_entry_is_retrievable(self, repo):
        entry = repo.create(75.5, D1)
        assert repo.get_by_id(entry.id) is not None


class TestUpdate:
    def test_update_weight(self, repo):
        entry = repo.create(80.0, D1)
        updated = repo.update(entry, weight=85.0, date=None)
        assert updated.weight == 85.0
        assert updated.date == D1

    def test_update_date(self, repo):
        entry = repo.create(80.0, D1)
        updated = repo.update(entry, weight=None, date=D2)
        assert updated.weight == 80.0
        assert updated.date == D2

    def test_update_both(self, repo):
        entry = repo.create(80.0, D1)
        updated = repo.update(entry, weight=90.0, date=D3)
        assert updated.weight == 90.0
        assert updated.date == D3

    def test_update_nothing_leaves_entry_unchanged(self, repo):
        entry = repo.create(80.0, D1)
        updated = repo.update(entry, weight=None, date=None)
        assert updated.weight == 80.0
        assert updated.date == D1


class TestDelete:
    def test_removes_entry(self, repo):
        entry = repo.create(80.0, D1)
        entry_id = entry.id
        repo.delete(entry)
        assert repo.get_by_id(entry_id) is None

    def test_only_deletes_target(self, repo):
        a = repo.create(80.0, D1)
        b = repo.create(81.0, D2)
        repo.delete(a)
        assert repo.get_by_id(b.id) is not None
