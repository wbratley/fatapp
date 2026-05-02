from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.weight_entry import WeightEntryRepository
from app.schemas.weight_entry import WeightEntryCreate, WeightEntryResponse, WeightEntryUpdate
from app.services.weight_entry import WeightEntryService

router = APIRouter(prefix="/weight-entries", tags=["weight-entries"])


def get_service(db: Session = Depends(get_db)) -> WeightEntryService:
    return WeightEntryService(WeightEntryRepository(db))


@router.get("/", response_model=list[WeightEntryResponse])
def list_entries(
    start: datetime | None = None,
    end: datetime | None = None,
    service: WeightEntryService = Depends(get_service),
) -> list[WeightEntryResponse]:
    return service.list_entries(start=start, end=end)


@router.get("/{entry_id}", response_model=WeightEntryResponse)
def get_entry(
    entry_id: int, service: WeightEntryService = Depends(get_service)
) -> WeightEntryResponse:
    return service.get_entry(entry_id)


@router.post("/", response_model=WeightEntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry(
    payload: WeightEntryCreate, service: WeightEntryService = Depends(get_service)
) -> WeightEntryResponse:
    return service.create_entry(payload)


@router.patch("/{entry_id}", response_model=WeightEntryResponse)
def update_entry(
    entry_id: int,
    payload: WeightEntryUpdate,
    service: WeightEntryService = Depends(get_service),
) -> WeightEntryResponse:
    return service.update_entry(entry_id, payload)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int, service: WeightEntryService = Depends(get_service)
) -> None:
    service.delete_entry(entry_id)
