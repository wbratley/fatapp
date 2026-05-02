from datetime import datetime

from fastapi import HTTPException, status

from app.repositories.weight_entry import WeightEntryRepository
from app.schemas.weight_entry import WeightEntryCreate, WeightEntryResponse, WeightEntryUpdate


class WeightEntryService:
    def __init__(self, repo: WeightEntryRepository) -> None:
        self._repo = repo

    def list_entries(
        self, start: datetime | None = None, end: datetime | None = None
    ) -> list[WeightEntryResponse]:
        if start and end and start > end:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="start date must be before end date",
            )
        entries = self._repo.get_all(start=start, end=end)
        return [WeightEntryResponse.model_validate(e) for e in entries]

    def get_entry(self, entry_id: int) -> WeightEntryResponse:
        entry = self._repo.get_by_id(entry_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Weight entry not found"
            )
        return WeightEntryResponse.model_validate(entry)

    def create_entry(self, payload: WeightEntryCreate) -> WeightEntryResponse:
        entry = self._repo.create(weight=payload.weight, date=payload.date)
        return WeightEntryResponse.model_validate(entry)

    def update_entry(self, entry_id: int, payload: WeightEntryUpdate) -> WeightEntryResponse:
        entry = self._repo.get_by_id(entry_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Weight entry not found"
            )
        entry = self._repo.update(entry, weight=payload.weight, date=payload.date)
        return WeightEntryResponse.model_validate(entry)

    def delete_entry(self, entry_id: int) -> None:
        entry = self._repo.get_by_id(entry_id)
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Weight entry not found"
            )
        self._repo.delete(entry)
