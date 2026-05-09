import re
from dataclasses import dataclass

import httpx

_SERVING_LABEL_RE = re.compile(r'^\d+(?:[.,]\d+)?\s+(.+?)\s*\(', re.IGNORECASE)


def _parse_serving_label(serving_size: object) -> str | None:
    try:
        if not serving_size or not isinstance(serving_size, str):
            return None
        m = _SERVING_LABEL_RE.match(serving_size.strip())
        return m.group(1).strip().lower() if m else None
    except Exception:
        return None


@dataclass
class ProductInfo:
    name: str
    calories_per_100g: float
    serving_quantity: float | None = None
    serving_label: str | None = None


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

        raw_serving = product.get("serving_quantity")
        serving_quantity = float(raw_serving) if raw_serving is not None else None
        serving_label = _parse_serving_label(product.get("serving_size"))

        return ProductInfo(
            name=name,
            calories_per_100g=float(calories),
            serving_quantity=serving_quantity,
            serving_label=serving_label,
        )
