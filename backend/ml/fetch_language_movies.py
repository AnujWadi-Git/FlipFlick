"""
The base dataset is heavily English-skewed (~4,800 English movies vs.
19-76 for each other language FlipFlick offers), so a language+genre
combo like Hindi+Horror can have zero matches and the recommender falls
back to "any Hindi movie" regardless of genre.

This pulls a broad, genre-diverse set of popular movies per language
straight from TMDB (sorted by popularity, no date restriction) and
appends them to data/movies_raw.csv in the same schema as
fetch_recent_movies.py. Re-run `python train.py` afterward.
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

# languages FlipFlick's UI actually offers, minus English (already well covered)
LANGUAGES = ["hi", "fr", "es", "ko", "ja"]
PAGES_PER_LANGUAGE = 15  # ~20/page -> up to ~300 candidates per language


def discover_ids(client: httpx.Client, lang: str) -> list[int]:
    ids: list[int] = []
    for page in range(1, PAGES_PER_LANGUAGE + 1):
        resp = client.get(
            f"{BASE_URL}/discover/movie",
            params={
                "api_key": TMDB_API_KEY,
                "with_original_language": lang,
                "sort_by": "popularity.desc",
                "vote_count.gte": 15,
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
    for attempt in range(3):
        try:
            resp = client.get(
                f"{BASE_URL}/movie/{movie_id}",
                params={"api_key": TMDB_API_KEY, "append_to_response": "keywords,credits"},
            )
            break
        except httpx.HTTPError:
            if attempt == 2:
                return None
            time.sleep(1.5 * (attempt + 1))
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

    only_langs = sys.argv[1:] or LANGUAGES

    with httpx.Client(timeout=15.0) as client:
        for lang in only_langs:
            # re-read fresh each language so a crash only loses the current language's progress
            existing = pd.read_csv(RAW_PATH)
            existing_titles_years = set(
                zip(existing["title"].str.lower(), pd.to_datetime(existing["release_date"], errors="coerce").dt.year)
            )

            ids = discover_ids(client, lang)
            print(f"{lang}: {len(ids)} candidates")
            rows = []
            for movie_id in ids:
                row = fetch_movie(client, movie_id)
                if row and row["overview"] and row["genres"]:
                    key = (row["title"].lower(), pd.to_datetime(row["release_date"], errors="coerce").year)
                    if key not in existing_titles_years:
                        rows.append(row)
                        existing_titles_years.add(key)
                time.sleep(0.02)

            new_df = pd.DataFrame(rows)
            if len(new_df):
                new_df.insert(0, "index", range(len(existing), len(existing) + len(new_df)))
                combined = pd.concat([existing, new_df], ignore_index=True)
                combined.to_csv(RAW_PATH, index=False)
                print(f"  -> added {len(rows)} new {lang} movies; movies_raw.csv now has {len(combined)} rows")
            else:
                print(f"  -> added 0 new {lang} movies")


if __name__ == "__main__":
    main()
