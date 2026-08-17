"""
Optional TMDB poster lookup. FlipFlick works perfectly without any API key
(the frontend renders a generated gradient poster instead) — if a
TMDB_API_KEY is present in the environment, we opportunistically resolve a
real poster image and cache it in memory for the process lifetime.
"""
import os

import httpx

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "").strip()
TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

_cache: dict[str, str | None] = {}


async def get_poster_url(title: str, year: int) -> str | None:
    if not TMDB_API_KEY:
        return None

    key = f"{title}::{year}"
    if key in _cache:
        return _cache[key]

    poster_url = None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                TMDB_SEARCH_URL,
                params={"api_key": TMDB_API_KEY, "query": title, "year": year},
            )
            if resp.status_code == 200:
                results = resp.json().get("results") or []
                if results and results[0].get("poster_path"):
                    poster_url = TMDB_IMAGE_BASE + results[0]["poster_path"]
    except (httpx.HTTPError, ValueError):
        poster_url = None

    _cache[key] = poster_url
    return poster_url
