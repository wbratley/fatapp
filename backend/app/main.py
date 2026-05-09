from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.calorie_consume_records import router as calorie_consume_records_router
from app.api.routes.food_items import router as food_items_router
from app.api.routes.meals import router as meals_router
from app.api.routes.weight_entries import router as weight_entries_router
from sqlalchemy import text

from app.database import Base, engine
from app.models import calorie_consume_record, food_item, meal, weight_entry  # noqa: F401


def _run_migrations() -> None:
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE food_items ADD COLUMN portion_size_g REAL",
            "ALTER TABLE food_items ADD COLUMN portion_label TEXT",
        ]:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass


_run_migrations()
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
app.include_router(food_items_router, prefix="/api/v1")
app.include_router(calorie_consume_records_router, prefix="/api/v1")
app.include_router(meals_router, prefix="/api/v1")
