from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.weight_entries import router as weight_entries_router
from app.database import Base, engine
from app.models import weight_entry  # noqa: F401 — registers ORM model with Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FatApp API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(weight_entries_router, prefix="/api/v1")
