"""API integration tests — hit the full stack via TestClient with a real in-memory DB."""
from fastapi.testclient import TestClient


class TestListEntries:
    def test_empty(self, client: TestClient):
        r = client.get("/api/v1/weight-entries/")
        assert r.status_code == 200
        assert r.json() == []

    def test_returns_created_entries(self, client: TestClient):
        client.post("/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"})
        client.post("/api/v1/weight-entries/", json={"weight": 81.0, "date": "2026-02-01T08:00:00"})
        r = client.get("/api/v1/weight-entries/")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_filter_by_start(self, client: TestClient):
        client.post("/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"})
        client.post("/api/v1/weight-entries/", json={"weight": 81.0, "date": "2026-03-01T08:00:00"})
        r = client.get("/api/v1/weight-entries/?start=2026-02-01T00:00:00")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["weight"] == 81.0

    def test_filter_by_end(self, client: TestClient):
        client.post("/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"})
        client.post("/api/v1/weight-entries/", json={"weight": 81.0, "date": "2026-03-01T08:00:00"})
        r = client.get("/api/v1/weight-entries/?end=2026-02-01T00:00:00")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["weight"] == 80.0

    def test_filter_by_start_and_end(self, client: TestClient):
        client.post("/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"})
        client.post("/api/v1/weight-entries/", json={"weight": 81.0, "date": "2026-02-01T08:00:00"})
        client.post("/api/v1/weight-entries/", json={"weight": 82.0, "date": "2026-03-01T08:00:00"})
        r = client.get("/api/v1/weight-entries/?start=2026-01-15T00:00:00&end=2026-02-15T00:00:00")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["weight"] == 81.0

    def test_returns_422_when_start_after_end(self, client: TestClient):
        r = client.get("/api/v1/weight-entries/?start=2026-03-01T00:00:00&end=2026-01-01T00:00:00")
        assert r.status_code == 422


class TestGetEntry:
    def test_returns_entry(self, client: TestClient):
        created = client.post(
            "/api/v1/weight-entries/", json={"weight": 77.0, "date": "2026-01-01T08:00:00"}
        ).json()
        r = client.get(f"/api/v1/weight-entries/{created['id']}")
        assert r.status_code == 200
        assert r.json()["weight"] == 77.0

    def test_returns_404_for_missing(self, client: TestClient):
        r = client.get("/api/v1/weight-entries/9999")
        assert r.status_code == 404


class TestCreateEntry:
    def test_creates_and_returns_entry(self, client: TestClient):
        r = client.post(
            "/api/v1/weight-entries/", json={"weight": 83.5, "date": "2026-05-01T07:30:00"}
        )
        assert r.status_code == 201
        data = r.json()
        assert data["weight"] == 83.5
        assert data["date"] == "2026-05-01T07:30:00"
        assert "id" in data

    def test_rejects_missing_weight(self, client: TestClient):
        r = client.post("/api/v1/weight-entries/", json={"date": "2026-05-01T07:30:00"})
        assert r.status_code == 422

    def test_rejects_missing_date(self, client: TestClient):
        r = client.post("/api/v1/weight-entries/", json={"weight": 83.5})
        assert r.status_code == 422

    def test_rejects_zero_weight(self, client: TestClient):
        r = client.post(
            "/api/v1/weight-entries/", json={"weight": 0, "date": "2026-05-01T07:30:00"}
        )
        assert r.status_code == 422

    def test_rejects_negative_weight(self, client: TestClient):
        r = client.post(
            "/api/v1/weight-entries/", json={"weight": -5.0, "date": "2026-05-01T07:30:00"}
        )
        assert r.status_code == 422


class TestUpdateEntry:
    def test_updates_weight(self, client: TestClient):
        created = client.post(
            "/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"}
        ).json()
        r = client.patch(f"/api/v1/weight-entries/{created['id']}", json={"weight": 78.5})
        assert r.status_code == 200
        assert r.json()["weight"] == 78.5
        assert r.json()["date"] == "2026-01-01T08:00:00"

    def test_updates_date(self, client: TestClient):
        created = client.post(
            "/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"}
        ).json()
        r = client.patch(
            f"/api/v1/weight-entries/{created['id']}", json={"date": "2026-06-01T09:00:00"}
        )
        assert r.status_code == 200
        assert r.json()["weight"] == 80.0
        assert r.json()["date"] == "2026-06-01T09:00:00"

    def test_updates_both_fields(self, client: TestClient):
        created = client.post(
            "/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"}
        ).json()
        r = client.patch(
            f"/api/v1/weight-entries/{created['id']}",
            json={"weight": 79.0, "date": "2026-06-01T09:00:00"},
        )
        assert r.status_code == 200
        assert r.json()["weight"] == 79.0
        assert r.json()["date"] == "2026-06-01T09:00:00"

    def test_returns_404_for_missing(self, client: TestClient):
        r = client.patch("/api/v1/weight-entries/9999", json={"weight": 70.0})
        assert r.status_code == 404

    def test_rejects_zero_weight(self, client: TestClient):
        created = client.post(
            "/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"}
        ).json()
        r = client.patch(f"/api/v1/weight-entries/{created['id']}", json={"weight": 0})
        assert r.status_code == 422


class TestDeleteEntry:
    def test_deletes_entry(self, client: TestClient):
        created = client.post(
            "/api/v1/weight-entries/", json={"weight": 80.0, "date": "2026-01-01T08:00:00"}
        ).json()
        r = client.delete(f"/api/v1/weight-entries/{created['id']}")
        assert r.status_code == 204
        assert client.get(f"/api/v1/weight-entries/{created['id']}").status_code == 404

    def test_returns_404_for_missing(self, client: TestClient):
        r = client.delete("/api/v1/weight-entries/9999")
        assert r.status_code == 404
