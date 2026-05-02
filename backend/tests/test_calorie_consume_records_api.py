"""API integration tests for calorie consume records."""
import pytest
from fastapi.testclient import TestClient

TS1 = "2026-01-01T08:00:00"
TS2 = "2026-03-01T08:00:00"


@pytest.fixture()
def food_item(client: TestClient) -> dict:  # type: ignore[type-arg]
    r = client.post("/api/v1/food-items/", json={"name": "Apple", "calories_per_100g": 52.0})
    return r.json()  # type: ignore[no-any-return]


def _record_payload(food_item_id: int, grams: float, ts: str) -> dict:  # type: ignore[type-arg]
    return {"food_item_id": food_item_id, "grams": grams, "timestamp": ts}


class TestListRecords:
    def test_empty(self, client: TestClient) -> None:
        r = client.get("/api/v1/calorie-consume-records/")
        assert r.status_code == 200
        assert r.json() == []

    def test_returns_records_with_food_item_name(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(food_item["id"], 200.0, TS1),
        )
        r = client.get("/api/v1/calorie-consume-records/")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["food_item_name"] == "Apple"

    def test_filter_by_start(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        fid = food_item["id"]
        client.post("/api/v1/calorie-consume-records/", json=_record_payload(fid, 100.0, TS1))
        client.post("/api/v1/calorie-consume-records/", json=_record_payload(fid, 100.0, TS2))
        r = client.get("/api/v1/calorie-consume-records/?start=2026-02-01T00:00:00")
        assert len(r.json()) == 1
        assert r.json()[0]["timestamp"].startswith("2026-03")

    def test_filter_by_end(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        fid = food_item["id"]
        client.post("/api/v1/calorie-consume-records/", json=_record_payload(fid, 100.0, TS1))
        client.post("/api/v1/calorie-consume-records/", json=_record_payload(fid, 100.0, TS2))
        r = client.get("/api/v1/calorie-consume-records/?end=2026-02-01T00:00:00")
        assert len(r.json()) == 1
        assert r.json()[0]["timestamp"].startswith("2026-01")


class TestGetRecord:
    def test_returns_record(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        created = client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(food_item["id"], 150.0, TS1),
        ).json()
        r = client.get(f"/api/v1/calorie-consume-records/{created['id']}")
        assert r.status_code == 200
        assert r.json()["grams"] == 150.0

    def test_returns_404_for_missing(self, client: TestClient) -> None:
        assert client.get("/api/v1/calorie-consume-records/9999").status_code == 404


class TestCreateRecord:
    def test_creates_with_calculated_calories(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        r = client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(food_item["id"], 200.0, TS1),
        )
        assert r.status_code == 201
        data = r.json()
        assert data["total_calories"] == pytest.approx(104.0)
        assert data["food_item_name"] == "Apple"
        assert data["grams"] == 200.0
        assert "id" in data

    def test_defaults_timestamp_to_now_when_omitted(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        r = client.post(
            "/api/v1/calorie-consume-records/",
            json={"food_item_id": food_item["id"], "grams": 100.0},
        )
        assert r.status_code == 201
        assert r.json()["timestamp"] is not None

    def test_returns_404_for_missing_food_item(self, client: TestClient) -> None:
        r = client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(9999, 100.0, TS1),
        )
        assert r.status_code == 404

    def test_returns_422_for_deleted_food_item(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        client.delete(f"/api/v1/food-items/{food_item['id']}")
        r = client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(food_item["id"], 100.0, TS1),
        )
        assert r.status_code == 422

    def test_rejects_zero_grams(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        r = client.post(
            "/api/v1/calorie-consume-records/",
            json={"food_item_id": food_item["id"], "grams": 0, "timestamp": TS1},
        )
        assert r.status_code == 422


class TestUpdateRecord:
    def test_recalculates_calories_when_grams_change(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        created = client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(food_item["id"], 100.0, TS1),
        ).json()
        r = client.patch(
            f"/api/v1/calorie-consume-records/{created['id']}", json={"grams": 200.0}
        )
        assert r.status_code == 200
        assert r.json()["grams"] == 200.0
        assert r.json()["total_calories"] == pytest.approx(104.0)

    def test_preserves_calories_when_only_timestamp_changes(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        created = client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(food_item["id"], 100.0, TS1),
        ).json()
        original_calories = created["total_calories"]
        r = client.patch(
            f"/api/v1/calorie-consume-records/{created['id']}",
            json={"timestamp": "2026-06-01T12:00:00"},
        )
        assert r.status_code == 200
        assert r.json()["total_calories"] == original_calories

    def test_returns_404_for_missing(self, client: TestClient) -> None:
        r = client.patch("/api/v1/calorie-consume-records/9999", json={"grams": 100.0})
        assert r.status_code == 404


class TestDeleteRecord:
    def test_deletes_record(
        self, client: TestClient, food_item: dict  # type: ignore[type-arg]
    ) -> None:
        created = client.post(
            "/api/v1/calorie-consume-records/",
            json=_record_payload(food_item["id"], 100.0, TS1),
        ).json()
        assert (
            client.delete(f"/api/v1/calorie-consume-records/{created['id']}").status_code == 204
        )
        assert client.get(f"/api/v1/calorie-consume-records/{created['id']}").status_code == 404

    def test_returns_404_for_missing(self, client: TestClient) -> None:
        assert client.delete("/api/v1/calorie-consume-records/9999").status_code == 404
