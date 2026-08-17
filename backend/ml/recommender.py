"""
FlipFlick recommendation engine.

Pipeline (see README for the full writeup):
  1. Hard-filter the catalogue by the user's constraints (language, genre,
     rating floor, era, runtime). If too few movies survive, progressively
     relax constraints so the user never hits a dead end.
  2. Score every surviving candidate with a content-based relevance score:
     cosine similarity between a TF-IDF "pseudo-document" built from the
     user's genre/mood picks and each movie's own TF-IDF vector, blended
     with a normalized rating/popularity quality score.
  3. Keep the top ~50 as the weighted candidate pool.
  4. Turn scores into a probability distribution (softmax) and sample ONE
     movie from it. This is the "intelligent randomness": the flip feels
     random to the user, but the odds were shaped by the ML step.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from preprocessing import LANGUAGE_MAP, MOOD_LEXICON

POOL_SIZE = 50
MIN_POOL_BEFORE_RELAX = 15
SOFTMAX_TEMPERATURE = 0.05

ERA_RANGES = {
    "new": (2024, 2100),
    "2020s": (2020, 2029),
    "2010s": (2010, 2019),
    "2000s": (2000, 2009),
    "1990s": (1990, 1999),
    "classic": (1900, 1989),
    "surprise": None,
}

RUNTIME_RANGES = {
    "under90": (0, 89),
    "90to120": (90, 120),
    "2plus": (121, 10_000),
    "surprise": None,
}

RATING_MIN_VOTES = 15  # ignore obscure/low-signal titles when a rating floor is set


@dataclass
class Preferences:
    language: str = "Any language"
    genres: list[str] = field(default_factory=list)
    min_rating: float = 0.0
    era: str = "surprise"
    mood: Optional[str] = None
    runtime: str = "surprise"
    exclude_ids: list[str] = field(default_factory=list)
    surprise_me: bool = False


class Recommender:
    def __init__(self, df: pd.DataFrame, vectorizer, matrix):
        self.df = df.reset_index(drop=True)
        self.vectorizer = vectorizer
        self.matrix = matrix
        max_pop = self.df["popularity"].max() or 1
        self.df["popularity_norm"] = self.df["popularity"] / max_pop
        self.df["rating_norm"] = self.df["vote_average"] / 10.0

    # ---------------------------------------------------------- filtering
    def _apply_filters(self, prefs: Preferences):
        mask = pd.Series(True, index=self.df.index)
        applied = []
        relaxed = []

        lang_code = LANGUAGE_MAP.get(prefs.language.lower()) if prefs.language else None
        if lang_code:
            lang_mask = mask & (self.df["original_language"] == lang_code)
            if lang_mask.sum() >= MIN_POOL_BEFORE_RELAX:
                mask = lang_mask
                applied.append(f"language={prefs.language}")
            else:
                relaxed.append(f"language={prefs.language}")

        if prefs.genres:
            genre_mask = mask & self.df["genres_list"].apply(
                lambda gs: any(g in gs for g in prefs.genres)
            )
            if genre_mask.sum() >= MIN_POOL_BEFORE_RELAX:
                mask = genre_mask
                applied.append(f"genres={prefs.genres}")
            else:
                relaxed.append(f"genres={prefs.genres}")

        if prefs.min_rating > 0:
            rating_mask = mask & (self.df["vote_average"] >= prefs.min_rating) & (
                self.df["vote_count"] >= RATING_MIN_VOTES
            )
            if rating_mask.sum() >= MIN_POOL_BEFORE_RELAX:
                mask = rating_mask
                applied.append(f"min_rating={prefs.min_rating}")
            else:
                relaxed.append(f"min_rating={prefs.min_rating}")

        era_range = ERA_RANGES.get(prefs.era)
        if era_range:
            lo, hi = era_range
            era_mask = mask & self.df["year"].between(lo, hi)
            if era_mask.sum() >= MIN_POOL_BEFORE_RELAX:
                mask = era_mask
                applied.append(f"era={prefs.era}")
            else:
                relaxed.append(f"era={prefs.era}")

        rt_range = RUNTIME_RANGES.get(prefs.runtime)
        if rt_range:
            lo, hi = rt_range
            rt_mask = mask & self.df["runtime"].between(lo, hi)
            if rt_mask.sum() >= MIN_POOL_BEFORE_RELAX:
                mask = rt_mask
                applied.append(f"runtime={prefs.runtime}")
            else:
                relaxed.append(f"runtime={prefs.runtime}")

        if mask.sum() < MIN_POOL_BEFORE_RELAX:
            # last resort: drop everything except a soft quality floor
            mask = self.df["vote_count"] >= 10

        return mask, applied, relaxed

    # -------------------------------------------------------------- query
    def _query_vector(self, prefs: Preferences):
        terms = []
        for g in prefs.genres:
            terms += [g.lower()] * 3
        if prefs.mood and prefs.mood in MOOD_LEXICON:
            lex = MOOD_LEXICON[prefs.mood]
            terms += [g.lower() for g in lex["genres"]] * 2
            terms += lex["keywords"]
        if not terms:
            terms = ["popular", "acclaimed", "favorite"]
        text = " ".join(terms)
        return self.vectorizer.transform([text])

    # ------------------------------------------------------------- scoring
    def build_pool(self, prefs: Preferences) -> dict:
        mask, applied, relaxed = self._apply_filters(prefs)
        candidate_idx = self.df.index[mask].to_numpy()

        query_vec = self._query_vector(prefs)
        sims = cosine_similarity(query_vec, self.matrix[candidate_idx]).flatten()

        sub = self.df.loc[candidate_idx].copy()
        sub["similarity"] = sims
        sub["ml_score"] = (
            sub["similarity"] * 0.60
            + sub["rating_norm"] * 0.25
            + sub["popularity_norm"] * 0.15
        )

        pool = sub.sort_values("ml_score", ascending=False).head(POOL_SIZE).copy()

        return {
            "pool": pool,
            "filters_applied": applied,
            "filters_relaxed": relaxed,
            "widened": len(relaxed) > 0,
            "raw_candidate_count": int(mask.sum()),
        }

    def sample(self, pool: pd.DataFrame, exclude_ids: list[str], surprise_me: bool = False) -> pd.Series:
        eligible = pool[~pool["movie_id"].isin(exclude_ids)]
        if eligible.empty:
            eligible = pool  # exhausted the pool -> allow repeats rather than dead-ending

        scores = eligible["ml_score"].to_numpy()
        if surprise_me:
            # flatten the distribution so quality still matters but it's far less predictable
            scores = np.sqrt(np.clip(scores, 1e-6, None))

        weights = self._softmax(scores, temperature=SOFTMAX_TEMPERATURE)
        choice_pos = np.random.choice(len(eligible), p=weights)
        chosen = eligible.iloc[choice_pos].copy()
        chosen["sample_weight"] = float(weights[choice_pos])
        return chosen

    @staticmethod
    def _softmax(scores: np.ndarray, temperature: float) -> np.ndarray:
        z = scores / temperature
        z = z - z.max()
        e = np.exp(z)
        return e / e.sum()

    # --------------------------------------------------------- explaining
    def explain(self, movie: pd.Series, prefs: Preferences) -> str:
        reasons = []
        matched_genres = [g for g in prefs.genres if g in movie["genres_list"]]
        if matched_genres:
            reasons.append(f"you asked for {', '.join(matched_genres).lower()}")
        if prefs.mood and prefs.mood in MOOD_LEXICON:
            lex = MOOD_LEXICON[prefs.mood]
            if any(g in movie["genres_list"] for g in lex["genres"]) or any(
                kw in " ".join(movie["keywords_list"]).lower() for kw in lex["keywords"]
            ):
                reasons.append(f"it matches that '{prefs.mood}' feeling")
        if prefs.min_rating and movie["vote_average"] >= prefs.min_rating:
            reasons.append(f"it's rated {movie['vote_average']:.1f}/10, clearing your {prefs.min_rating:.0f}+ bar")
        era_range = ERA_RANGES.get(prefs.era)
        if era_range and era_range[0] <= movie["year"] <= era_range[1]:
            reasons.append(f"it's from {movie['year']}, right in your {prefs.era} window")
        rt_range = RUNTIME_RANGES.get(prefs.runtime)
        if rt_range and rt_range[0] <= movie["runtime"] <= rt_range[1]:
            if movie["runtime"] >= 121:
                reasons.append("its runtime matches your ‘I have time tonight’ vibe")
            elif movie["runtime"] <= 89:
                reasons.append("it's short and tight, matching your quick-watch pick")
            else:
                reasons.append("its runtime lands right in your sweet spot")

        if not reasons:
            return f"{movie['title']} scored highest across your picks once we weighed genre, rating, and vibe together."

        prefix = "You asked for something " if len(reasons) > 1 else "You wanted "
        return prefix + "; ".join(reasons) + f" — {movie['title']} came out on top."
