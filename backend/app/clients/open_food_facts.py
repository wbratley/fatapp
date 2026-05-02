from dataclasses import dataclass

import httpx


@dataclass
class ProductInfo:
    name: str
    calories_per_100g: float


class OpenFoodFactsClient:
    _BASE = "https://world.openfoodfacts.org/api/v0/product"
    _TIMEOUT = 5.0

    def lookup(self, barcode: str) -> ProductInfo | None:
        try:
            r = httpx.get(f"{self._BASE}/{barcode}.json", timeout=self._TIMEOUT)
            r.raise_for_status()
            data = r.json()
        except (httpx.HTTPError, ValueError):
            return None

        if data.get("status") != 1:
            return None

        product = data.get("product", {})
        name = (product.get("product_name") or product.get("brands") or "").strip()
        calories = product.get("nutriments", {}).get("energy-kcal_100g")

        if not name or calories is None:
            return None

        return ProductInfo(name=name, calories_per_100g=float(calories))
