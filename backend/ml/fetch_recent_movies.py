"""
Pulls real 2024-2026 releases from TMDB and appends them to
data/movies_raw.csv in the same schema as the base dataset, so they flow
through the existing preprocessing/embeddings pipeline untouched.

Requires TMDB_API_KEY in backend/.env. Run, then re-run `python train.py`
to rebuild movies_processed.parquet and the TF-IDF artifacts.

New rows use a "|" delimiter for cast/keywords (each token is a full name/
phrase) instead of the legacy dataset's ambiguous space-joined format --
preprocessing.py's parsers understand both.
"""
import os
import sys
import time
from pathlib import Path

import httpx
import pandas as pd
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "").strip()
BASE_URL = "https://api.themoviedb.org/3"
RAW_PATH = BACKEND_DIR / "data" / "movies_raw.csv"

DATE_RANGES = [("2024-01-01", "2024-12-31"), ("2025-01-01", "2025-12-31"), ("2026-01-01", "2026-12-31")]
PAGES_PER_RANGE = 8  # ~20 movies/page -> up to ~160 movies per year


def discover_ids(client: httpx.Client, gte: str, lte: str) -> list[int]:
    ids: list[int] = []
    for page in range(1, PAGES_PER_RANGE + 1):
        resp = client.get(
            f"{BASE_URL}/discover/movie",
            params={
                "api_key": TMDB_API_KEY,
                "sort_by": "popularity.desc",
                "primary_release_date.gte": gte,
                "primary_release_date.lte": lte,
                "include_adult": "false",
                "vote_count.gte": 0,
                "page": page,
            },
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
        if not results:
            break
        ids.extend(m["id"] for m in results)
    return ids


def fetch_movie(client: httpx.Client, movie_id: int) -> dict | None:
    resp = client.get(
        f"{BASE_URL}/movie/{movie_id}",
        params={"api_key": TMDB_API_KEY, "append_to_response": "keywords,credits"},
    )
    if resp.status_code != 200:
        return None
    data = resp.json()

    genres = " ".join(g["name"] for g in data.get("genres", []))
    keywords = "|".join(k["name"] for k in data.get("keywords", {}).get("keywords", []))
    cast = "|".join(c["name"] for c in data.get("credits", {}).get("cast", [])[:5])
    crew = data.get("credits", {}).get("crew", [])
    director = next((c["name"] for c in crew if c.get("job") == "Director"), "Unknown")
    spoken_languages = str([{"name": lang["english_name"]} for lang in data.get("spoken_languages", [])])

    return {
        "budget": data.get("budget", 0),
        "genres": genres,
        "homepage": data.get("homepage") or "",
        "id": data.get("id"),
        "keywords": keywords,
        "original_language": data.get("original_language", "en"),
        "original_title": data.get("original_title", data.get("title", "")),
        "overview": data.get("overview", ""),
        "popularity": data.get("popularity", 0),
        "production_companies": "[]",
        "production_countries": "[]",
        "release_date": data.get("release_date", ""),
        "revenue": data.get("revenue", 0),
        "runtime": data.get("runtime") or 0,
        "spoken_languages": spoken_languages,
        "status": data.get("status", ""),
        "tagline": data.get("tagline") or "",
        "title": data.get("title", ""),
        "vote_average": data.get("vote_average", 0),
        "vote_count": data.get("vote_count", 0),
        "cast": cast,
        "crew": "[]",
        "director": director,
    }


def main():
    if not TMDB_API_KEY:
        print("TMDB_API_KEY not set in backend/.env — aborting.", file=sys.stderr)
        sys.exit(1)

    existing = pd.read_csv(RAW_PATH)
    existing_titles_years = set(
        zip(existing["title"].str.lower(), pd.to_datetime(existing["release_date"], errors="coerce").dt.year)
    )

    with httpx.Client(timeout=15.0) as client:
        all_ids: set[int] = set()
        for gte, lte in DATE_RANGES:
            ids = discover_ids(client, gte, lte)
            print(f"  {gte}..{lte}: {len(ids)} candidates")
            all_ids.update(ids)

        print(f"Fetching details for {len(all_ids)} movies...")
        rows = []
        for i, movie_id in enumerate(sorted(all_ids)):
            row = fetch_movie(client, movie_id)
            if row and row["overview"]:
                key = (row["title"].lower(), pd.to_datetime(row["release_date"], errors="coerce").year)
                if key not in existing_titles_years:
                    rows.append(row)
                    existing_titles_years.add(key)
            if (i + 1) % 40 == 0:
                print(f"  ...{i + 1}/{len(all_ids)}")
            time.sleep(0.02)

    print(f"Adding {len(rows)} new movies.")
    new_df = pd.DataFrame(rows)
    new_df.insert(0, "index", range(len(existing), len(existing) + len(new_df)))
    combined = pd.concat([existing, new_df], ignore_index=True)
    combined.to_csv(RAW_PATH, index=False)
    print(f"movies_raw.csv now has {len(combined)} rows.")


if __name__ == "__main__":
    main()
