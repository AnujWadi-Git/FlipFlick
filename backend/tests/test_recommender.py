"""
Scenario tests for the recommendation engine, run against the real trained
dataset/embeddings (no mocks) — these are the exact combinations that were
used to validate the scoring/filtering rework.

Run with: cd backend && source venv/bin/activate && pytest tests/ -v
"""
import sys
from pathlib import Path

import pandas as pd
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR / "ml"))

from preprocessing import PROCESSED_PATH  # noqa: E402
from embeddings import load_embeddings  # noqa: E402
from recommender import Recommender, Preferences  # noqa: E402


@pytest.fixture(scope="module")
def recommender():
    df = pd.read_parquet(PROCESSED_PATH)
    vectorizer, matrix = load_embeddings()
    return Recommender(df, vectorizer, matrix)


def pool_titles_and_genres(recommender, prefs, n=30):
    info = recommender.build_pool(prefs)
    top = info["pool"].head(n)
    return info, top


def test_french_thriller_2010s(recommender):
    prefs = Preferences(language="French", genres=["Thriller"], era="2010s")
    info, top = pool_titles_and_genres(recommender, prefs)
    assert not top.empty
    # language should be a real hard filter, not diluted
    assert (top["original_language"] == "fr").mean() >= 0.7
    # most of the pool should actually carry the requested genre (or a
    # related one, if the exact genre had to be widened)
    has_genre = top["genres_list"].apply(lambda gs: "Thriller" in gs)
    assert has_genre.mean() >= 0.4, "pool isn't meaningfully thriller-flavored"


def test_english_horror_1980s(recommender):
    prefs = Preferences(language="English", genres=["Horror"], era="classic")
    info, top = pool_titles_and_genres(recommender, prefs)
    assert not top.empty
    assert (top["original_language"] == "en").mean() >= 0.7
    has_horror = top["genres_list"].apply(lambda gs: "Horror" in gs)
    assert has_horror.mean() >= 0.5


def test_scifi_new(recommender):
    prefs = Preferences(genres=["Science Fiction"], era="new")
    info, top = pool_titles_and_genres(recommender, prefs)
    assert not top.empty
    has_scifi = top["genres_list"].apply(lambda gs: "Science Fiction" in gs)
    assert has_scifi.mean() >= 0.5


def test_no_genre_does_not_crash(recommender):
    prefs = Preferences(language="English", genres=[])
    info, top = pool_titles_and_genres(recommender, prefs)
    assert not top.empty
    assert info["raw_candidate_count"] > 0


def test_niche_combo_relaxes_gracefully(recommender):
    # Korean + Documentary is a thin slice of this catalogue; the engine
    # must never raise or return an empty pool.
    prefs = Preferences(language="Korean", genres=["Documentary"])
    info, top = pool_titles_and_genres(recommender, prefs)
    assert not top.empty


def test_exclude_ids_prevents_repeat(recommender):
    prefs = Preferences(language="English", genres=["Comedy"])
    info = recommender.build_pool(prefs)
    first = recommender.sample(info["pool"], exclude_ids=[])
    again = recommender.sample(info["pool"], exclude_ids=[str(first["movie_id"])])
    assert str(again["movie_id"]) != str(first["movie_id"])


def test_low_vote_high_rating_does_not_dominate(recommender):
    # A movie with a perfect score but only a handful of votes shouldn't
    # out-rank a well-established, widely-voted high performer.
    df = recommender.df
    established = df[(df["vote_count"] >= 5000) & (df["vote_average"] >= 8.0)]
    assert not established.empty, "fixture assumption: dataset has a well-voted 8.0+ movie"
    established_row = established.iloc[0]

    # synthetic long-tail case: 10/10 but only 3 votes
    obscure_bayesian = (3 / (3 + 200)) * 10.0 + (200 / (3 + 200)) * df["vote_average"].mean()
    assert established_row["bayesian_rating"] > obscure_bayesian


def test_surprise_respects_genre_when_given():
    """Regression test for the reported bug: selecting Horror and getting
    Spider-Man via Surprise Me. Surprise Me must keep genre as a real filter
    when the caller supplies one."""
    df = pd.read_parquet(PROCESSED_PATH)
    vectorizer, matrix = load_embeddings()
    rec = Recommender(df, vectorizer, matrix)

    prefs = Preferences(language="English", genres=["Horror"])
    info = rec.build_pool(prefs)
    for _ in range(15):
        chosen = rec.sample(info["pool"], exclude_ids=[], surprise_me=True)
        assert "Horror" in chosen["genres_list"] or info["widened"], (
            f"Surprise Me returned {chosen['title']!r} ({chosen['genres_list']}) "
            "with no Horror content and no widening — genre was ignored."
        )
