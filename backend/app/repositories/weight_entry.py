from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.weight_entry import WeightEntry


class WeightEntryRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_all(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> list[WeightEntry]:
        stmt = select(WeightEntry)
        if start is not None:
            stmt = stmt.where(WeightEntry.date >= start)
        if end is not None:
            stmt = stmt.where(WeightEntry.date <= end)
        stmt = stmt.order_by(WeightEntry.date)
        return list(self._db.scalars(stmt).all())

    def get_by_id(self, entry_id: int) -> WeightEntry | None:
        return self._db.get(WeightEntry, entry_id)

    def create(self, weight: float, date: datetime) -> WeightEntry:
        entry = WeightEntry(weight=weight, date=date)
        self._db.add(entry)
        self._db.commit()
        self._db.refresh(entry)
        return entry

    def update(
        self, entry: WeightEntry, weight: float | None, date: datetime | None
    ) -> WeightEntry:
        if weight is not None:
            entry.weight = weight
        if date is not None:
            entry.date = date
        self._db.commit()
        self._db.refresh(entry)
        return entry

    def delete(self, entry: WeightEntry) -> None:
        self._db.delete(entry)
        self._db.commit()
