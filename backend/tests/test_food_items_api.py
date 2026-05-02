"""API integration tests for food items."""
from fastapi.testclient import TestClient


class TestListFoodItems:
    def test_empty(self, client: TestClient) -> None:
        r = client.get("/api/v1/food-items/")
        assert r.status_code == 200
        assert r.json() == []

    def test_returns_active_items(self, client: TestClient) -> None:
        client.post("/api/v1/food-items/", json={"name": "Apple", "calories_per_100g": 52.0})
        r = client.get("/api/v1/food-items/")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_excludes_deleted_by_default(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Apple", "calories_per_100g": 52.0}
        ).json()
        client.delete(f"/api/v1/food-items/{created['id']}")
        assert client.get("/api/v1/food-items/").json() == []

    def test_includes_deleted_with_flag(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Apple", "calories_per_100g": 52.0}
        ).json()
        client.delete(f"/api/v1/food-items/{created['id']}")
        r = client.get("/api/v1/food-items/?include_deleted=true")
        assert len(r.json()) == 1
        assert r.json()[0]["deleted_at"] is not None


class TestGetFoodItem:
    def test_returns_item(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Banana", "calories_per_100g": 89.0}
        ).json()
        r = client.get(f"/api/v1/food-items/{created['id']}")
        assert r.status_code == 200
        assert r.json()["name"] == "Banana"

    def test_returns_404_for_missing(self, client: TestClient) -> None:
        assert client.get("/api/v1/food-items/9999").status_code == 404


class TestCreateFoodItem:
    def test_creates_item(self, client: TestClient) -> None:
        r = client.post(
            "/api/v1/food-items/",
            json={"name": "Oats", "calories_per_100g": 389.0, "barcode": "123"},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Oats"
        assert data["calories_per_100g"] == 389.0
        assert data["barcode"] == "123"
        assert data["deleted_at"] is None
        assert "id" in data

    def test_creates_without_barcode(self, client: TestClient) -> None:
        r = client.post("/api/v1/food-items/", json={"name": "Custom", "calories_per_100g": 200.0})
        assert r.status_code == 201
        assert r.json()["barcode"] is None

    def test_rejects_duplicate_barcode(self, client: TestClient) -> None:
        client.post(
            "/api/v1/food-items/", json={"name": "A", "calories_per_100g": 100.0, "barcode": "DUP"}
        )
        r = client.post(
            "/api/v1/food-items/", json={"name": "B", "calories_per_100g": 200.0, "barcode": "DUP"}
        )
        assert r.status_code == 409

    def test_rejects_zero_calories(self, client: TestClient) -> None:
        r = client.post("/api/v1/food-items/", json={"name": "X", "calories_per_100g": 0})
        assert r.status_code == 422

    def test_rejects_missing_name(self, client: TestClient) -> None:
        r = client.post("/api/v1/food-items/", json={"calories_per_100g": 100.0})
        assert r.status_code == 422


class TestUpdateFoodItem:
    def test_updates_name(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Old", "calories_per_100g": 100.0}
        ).json()
        r = client.patch(f"/api/v1/food-items/{created['id']}", json={"name": "New"})
        assert r.status_code == 200
        assert r.json()["name"] == "New"
        assert r.json()["calories_per_100g"] == 100.0

    def test_updates_calories(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Item", "calories_per_100g": 100.0}
        ).json()
        r = client.patch(f"/api/v1/food-items/{created['id']}", json={"calories_per_100g": 150.0})
        assert r.status_code == 200
        assert r.json()["calories_per_100g"] == 150.0

    def test_returns_404_for_missing(self, client: TestClient) -> None:
        assert client.patch("/api/v1/food-items/9999", json={"name": "X"}).status_code == 404

    def test_returns_409_on_barcode_conflict(self, client: TestClient) -> None:
        client.post(
            "/api/v1/food-items/",
            json={"name": "A", "calories_per_100g": 100.0, "barcode": "TAKEN"},
        )
        b = client.post(
            "/api/v1/food-items/", json={"name": "B", "calories_per_100g": 200.0}
        ).json()
        r = client.patch(f"/api/v1/food-items/{b['id']}", json={"barcode": "TAKEN"})
        assert r.status_code == 409


class TestDeleteFoodItem:
    def test_soft_deletes_item(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Item", "calories_per_100g": 100.0}
        ).json()
        assert client.delete(f"/api/v1/food-items/{created['id']}").status_code == 204

    def test_deleted_item_excluded_from_list(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Item", "calories_per_100g": 100.0}
        ).json()
        client.delete(f"/api/v1/food-items/{created['id']}")
        assert client.get("/api/v1/food-items/").json() == []

    def test_deleted_item_still_gettable(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Item", "calories_per_100g": 100.0}
        ).json()
        client.delete(f"/api/v1/food-items/{created['id']}")
        r = client.get(f"/api/v1/food-items/{created['id']}")
        assert r.status_code == 200
        assert r.json()["deleted_at"] is not None

    def test_returns_404_for_missing(self, client: TestClient) -> None:
        assert client.delete("/api/v1/food-items/9999").status_code == 404

    def test_returns_422_when_already_deleted(self, client: TestClient) -> None:
        created = client.post(
            "/api/v1/food-items/", json={"name": "Item", "calories_per_100g": 100.0}
        ).json()
        client.delete(f"/api/v1/food-items/{created['id']}")
        r = client.delete(f"/api/v1/food-items/{created['id']}")
        assert r.status_code == 422
