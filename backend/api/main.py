"""
FlipFlick API.

Startup loads the pre-built dataset + TF-IDF artifacts once into memory
(see ml/train.py to regenerate them). Everything after that is served
from RAM, which is what keeps a "flip" fast enough to never need a
loading spinner in front of the reel animation.
"""
import sys
import urllib.parse
import uuid
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR / "ml"))
sys.path.insert(0, str(BACKEND_DIR / "api"))

load_dotenv(BACKEND_DIR / ".env")

from preprocessing import PROCESSED_PATH  # noqa: E402
from embeddings import load_embeddings  # noqa: E402
from recommender import Recommender, Preferences  # noqa: E402

from schemas import (  # noqa: E402
    PreferencesIn, FlipIn, SurpriseIn, FeedbackIn, MovieOut, MLInsights, RecommendationOut,
)
from poster_service import get_poster_url  # noqa: E402

app = FastAPI(title="FlipFlick API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------- state
_state: dict = {}
_sessions: dict[str, dict] = {}

# duotones consistent with the Ferrari-derived palette: near-black canvas + Rosso Corsa red
POSTER_PALETTES = [
    ["#4a1216", "#181818"], ["#5c161c", "#181818"], ["#3a3a3a", "#181818"],
    ["#601a20", "#181818"], ["#2b2b2b", "#181818"], ["#451015", "#181818"],
    ["#4d4d4d", "#181818"], ["#551419", "#181818"], ["#333333", "#181818"],
    ["#3f1013", "#181818"],
]


@app.on_event("startup")
def load_model():
    df = pd.read_parquet(PROCESSED_PATH)
    vectorizer, matrix = load_embeddings()
    _state["df"] = df
    _state["recommender"] = Recommender(df, vectorizer, matrix)
    print(f"FlipFlick ready: {len(df)} movies loaded.")


@app.get("/api/health")
def health():
    return {"status": "ok", "movies_loaded": len(_state.get("df", []))}


# ---------------------------------------------------------------- helpers
def _poster_seed(movie_id: str) -> str:
    idx = int(movie_id) % len(POSTER_PALETTES)
    a, b = POSTER_PALETTES[idx]
    return f"{a},{b}"


async def _serialize_movie(movie: pd.Series) -> MovieOut:
    poster_url = await get_poster_url(movie["title"], int(movie["year"]))
    trailer_query = urllib.parse.quote(f"{movie['title']} {int(movie['year'])} official trailer")
    return MovieOut(
        id=str(movie["movie_id"]),
        title=movie["title"],
        year=int(movie["year"]),
        genres=list(movie["genres_list"]),
        language=movie["original_language"],
        rating=round(float(movie["vote_average"]), 1),
        vote_count=int(movie["vote_count"]),
        runtime=int(movie["runtime"]),
        overview=movie["overview"],
        tagline=movie["tagline"],
        director=movie["director"],
        cast=list(movie["cast_list"])[:5],
        poster_url=poster_url,
        poster_seed=_poster_seed(str(movie["movie_id"])),
        trailer_search_url=f"https://www.youtube.com/results?search_query={trailer_query}",
    )


def _build_insights(pool_info: dict, chosen: pd.Series) -> MLInsights:
    pool = pool_info["pool"]
    top = pool.sort_values("ml_score", ascending=False).head(8)
    return MLInsights(
        candidate_pool_size=len(pool),
        raw_candidate_count=pool_info["raw_candidate_count"],
        filters_applied=pool_info["filters_applied"],
        filters_relaxed=pool_info["filters_relaxed"],
        widened=pool_info["widened"],
        top_candidates=[
            {"title": r["title"], "score": round(float(r["ml_score"]), 4)}
            for _, r in top.iterrows()
        ],
        similarity_score=round(float(chosen["similarity"]), 4),
        sample_weight=round(float(chosen["sample_weight"]), 4),
        randomness_temperature=0.05,
    )


def _apply_diversity_penalty(pool: pd.DataFrame, chosen: pd.Series) -> None:
    """After a movie is shown, nudge its director/keyword neighbors down in
    the cached pool so the next flip in this session doesn't just resurface
    a near-duplicate. Mutates `pool` in place."""
    director = chosen["director"]
    chosen_keywords = set(chosen["keywords_list"])

    def penalty(row) -> float:
        p = 0.0
        if row["movie_id"] == chosen["movie_id"]:
            return p
        if row["director"] == director:
            p += 0.06
        if chosen_keywords:
            overlap = len(set(row["keywords_list"]) & chosen_keywords)
            p += min(overlap / 12, 0.05)
        return p

    pool["ml_score"] = pool["ml_score"] - pool.apply(penalty, axis=1)


def _apply_genre_feedback(pool: pd.DataFrame, feedback: dict[str, float]) -> None:
    """Ephemeral, session-only genre bias from 👍/👎 feedback — never
    persisted, discarded when the session ends."""
    if not feedback:
        return

    def bump(row) -> float:
        return sum(feedback.get(g, 0.0) for g in row["genres_list"])

    pool["ml_score"] = pool["ml_score"] + pool.apply(bump, axis=1)


async def _respond(session_id: str, session: dict, pool_info: dict, chosen: pd.Series, prefs: Preferences):
    recommender: Recommender = _state["recommender"]
    movie_out = await _serialize_movie(chosen)
    explanation = recommender.explain(chosen, prefs)

    widened_notice = None
    if pool_info["widened"]:
        widened_notice = "We couldn't find an exact match, so we widened the vibe slightly."

    session["shown_ids"].append(str(chosen["movie_id"]))
    session["flip_count"] += 1
    # diversify future flips in this session away from this pick's director/keywords
    _apply_diversity_penalty(pool_info["pool"], chosen)

    return RecommendationOut(
        session_id=session_id,
        movie=movie_out,
        explanation=explanation,
        widened_notice=widened_notice,
        insights=_build_insights(pool_info, chosen),
        flip_count=session["flip_count"],
    )


# ---------------------------------------------------------------- routes
@app.post("/api/session", response_model=RecommendationOut)
async def create_session(prefs_in: PreferencesIn):
    recommender: Recommender = _state["recommender"]
    if not recommender:
        raise HTTPException(503, "Model not loaded")

    prefs = Preferences(
        language=prefs_in.language,
        genres=prefs_in.genres,
        min_rating=prefs_in.min_rating,
        era=prefs_in.era,
        mood=prefs_in.mood,
        runtime=prefs_in.runtime,
    )

    pool_info = recommender.build_pool(prefs)
    if pool_info["pool"].empty:
        raise HTTPException(404, "No movies matched, even after widening filters.")

    chosen = recommender.sample(pool_info["pool"], exclude_ids=[])

    session_id = str(uuid.uuid4())
    session = {"prefs": prefs, "pool_info": pool_info, "shown_ids": [], "flip_count": 0, "genre_feedback": {}}
    _sessions[session_id] = session

    return await _respond(session_id, session, pool_info, chosen, prefs)


@app.post("/api/session/{session_id}/flip", response_model=RecommendationOut)
async def flip_again(session_id: str, body: FlipIn):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found — start a new flip.")

    recommender: Recommender = _state["recommender"]
    prefs: Preferences = session["prefs"]
    pool_info = session["pool_info"]

    chosen = recommender.sample(
        pool_info["pool"], exclude_ids=session["shown_ids"], surprise_me=body.surprise_me
    )
    return await _respond(session_id, session, pool_info, chosen, prefs)


@app.post("/api/surprise", response_model=RecommendationOut)
async def surprise_me(body: SurpriseIn = SurpriseIn()):
    """
    Wilder and less predictable than a normal flip, but NOT a free-for-all:
    if the caller has a language/genre already picked, Surprise Me keeps
    those as real filters (just skips rating/era/runtime) and flattens the
    score distribution for variety. Ignoring genre entirely here was the
    bug behind "I picked Horror and got Spider-Man" — Surprise Me must
    still respect whatever the user actually asked for.
    """
    recommender: Recommender = _state["recommender"]
    prefs = Preferences(
        language=body.language,
        genres=body.genres,
        min_rating=0.0,
        era="surprise",
        runtime="surprise",
    )

    pool_info = recommender.build_pool(prefs)
    chosen = recommender.sample(pool_info["pool"], exclude_ids=[], surprise_me=True)

    session_id = str(uuid.uuid4())
    session = {"prefs": prefs, "pool_info": pool_info, "shown_ids": [], "flip_count": 0, "genre_feedback": {}}
    _sessions[session_id] = session

    return await _respond(session_id, session, pool_info, chosen, prefs)


@app.post("/api/session/{session_id}/feedback", response_model=dict)
async def feedback(session_id: str, movie_id: str, body: FeedbackIn):
    """
    👍/👎 on a shown movie. Ephemeral and session-scoped only — nudges this
    session's remaining candidate pool toward/away from that movie's
    genres. Nothing is persisted once the session ends (FlipFlick has no
    accounts/storage to persist it to, and shouldn't invent one for this).
    """
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found — start a new flip.")

    df: pd.DataFrame = _state["df"]
    match = df[df["movie_id"] == movie_id]
    if match.empty:
        raise HTTPException(404, "Unknown movie_id for this catalogue.")
    movie = match.iloc[0]

    delta = 0.06 if body.liked else -0.06
    feedback_state = session["genre_feedback"]
    for g in movie["genres_list"]:
        feedback_state[g] = max(-0.2, min(0.2, feedback_state.get(g, 0.0) + delta))

    _apply_genre_feedback(session["pool_info"]["pool"], {g: delta for g in movie["genres_list"]})

    return {"status": "ok", "genre_bias": feedback_state}
