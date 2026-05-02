from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.calorie_consume_record import CalorieConsumeRecord


class CalorieConsumeRecordRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_all(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> list[CalorieConsumeRecord]:
        stmt = select(CalorieConsumeRecord).options(joinedload(CalorieConsumeRecord.food_item))
        if start is not None:
            stmt = stmt.where(CalorieConsumeRecord.timestamp >= start)
        if end is not None:
            stmt = stmt.where(CalorieConsumeRecord.timestamp <= end)
        stmt = stmt.order_by(CalorieConsumeRecord.timestamp)
        return list(self._db.scalars(stmt).unique().all())

    def get_by_id(self, record_id: int) -> CalorieConsumeRecord | None:
        stmt = (
            select(CalorieConsumeRecord)
            .options(joinedload(CalorieConsumeRecord.food_item))
            .where(CalorieConsumeRecord.id == record_id)
        )
        return self._db.scalars(stmt).first()

    def create(
        self,
        food_item_id: int,
        grams: float,
        timestamp: datetime,
        total_calories: float,
    ) -> CalorieConsumeRecord:
        record = CalorieConsumeRecord(
            food_item_id=food_item_id,
            grams=grams,
            timestamp=timestamp,
            total_calories=total_calories,
        )
        self._db.add(record)
        self._db.commit()
        self._db.refresh(record)
        return record

    def update(
        self,
        record: CalorieConsumeRecord,
        grams: float | None,
        timestamp: datetime | None,
        total_calories: float | None,
    ) -> CalorieConsumeRecord:
        if grams is not None:
            record.grams = grams
        if timestamp is not None:
            record.timestamp = timestamp
        if total_calories is not None:
            record.total_calories = total_calories
        self._db.commit()
        self._db.refresh(record)
        return record

    def delete(self, record: CalorieConsumeRecord) -> None:
        self._db.delete(record)
        self._db.commit()
