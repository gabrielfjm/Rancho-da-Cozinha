"""Refresh the English source snapshot from TheMealDB's official free API.

After importing, run scripts/translate_themealdb.py to update the pt-BR catalog.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import date
import json
from pathlib import Path
import re
import time
from urllib.request import Request, urlopen


API = "https://www.themealdb.com/api/json/v1/1/search.php?f={}"
OUTPUT = Path(__file__).resolve().parent / "data/themealdb-en.json"
CURATED_IDS = {"53482", "53481", "53483", "53476", "53485", "53475", "53477", "53478", "53484"}


def fetch(letter: str) -> list[dict]:
    for attempt in range(3):
        try:
            request = Request(API.format(letter), headers={"User-Agent": "Rancho-da-Cozinha/1.0"})
            with urlopen(request, timeout=30) as response:
                return json.load(response).get("meals") or []
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    return []


def steps(text: str) -> list[str]:
    clean = re.sub(r"<br\s*/?>", "\n", text or "", flags=re.I).replace("\u200b", "").replace("\ufeff", "")
    clean = re.sub(r"<[^>]+>", "", clean).replace("\r", "\n")
    lines = [re.sub(r"^\s*(?:step\s*)?\d+[.):\-]\s*", "", line, flags=re.I).strip(" -\t")
             for line in clean.split("\n")]
    lines = [line for line in lines if line]
    if len(lines) == 1 and len(lines[0]) > 500:
        sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", lines[0])
        grouped: list[str] = []
        for sentence in sentences:
            if grouped and len(grouped[-1]) + len(sentence) < 320:
                grouped[-1] += " " + sentence
            else:
                grouped.append(sentence)
        return grouped
    return lines


def compact(meal: dict) -> dict | None:
    ingredients = []
    for index in range(1, 21):
        name = (meal.get(f"strIngredient{index}") or "").strip()
        measure = (meal.get(f"strMeasure{index}") or "").strip()
        if name:
            ingredients.append([name, measure])
    instructions = steps(meal.get("strInstructions") or "")
    if not meal.get("strMeal") or len(ingredients) < 2 or sum(map(len, instructions)) < 50:
        return None
    return {
        "id": meal["idMeal"],
        "title": meal["strMeal"].strip(),
        "category": (meal.get("strCategory") or "Other").strip(),
        "area": (meal.get("strArea") or "").strip(),
        "tags": [tag.strip() for tag in (meal.get("strTags") or "").split(",") if tag.strip()],
        "image": (meal.get("strMealThumb") or "").strip(),
        "ingredients": ingredients,
        "steps": instructions,
    }


def main() -> None:
    with ThreadPoolExecutor(max_workers=5) as pool:
        pages = list(pool.map(fetch, "abcdefghijklmnopqrstuvwxyz"))
    by_id = {meal["idMeal"]: meal for page in pages for meal in page}
    recipes = [item for meal in by_id.values() if meal["idMeal"] not in CURATED_IDS
               if (item := compact(meal))]
    recipes.sort(key=lambda item: item["title"].casefold())
    if len(recipes) < 500:
        raise RuntimeError(f"Only {len(recipes)} recipes returned; keeping the existing catalog")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"source": "TheMealDB", "retrievedAt": date.today().isoformat(),
                                  "recipes": recipes}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Imported {len(recipes)} recipes from {len(by_id)} meals into {OUTPUT}")


if __name__ == "__main__":
    main()
