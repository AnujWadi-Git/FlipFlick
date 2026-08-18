"""
FlipFlick recommendation engine.

Pipeline (see README for the full writeup):
  1. Hard-filter the catalogue by the user's constraints (language, genre,
     rating floor, era, runtime). If a filter would leave too few
     candidates, try a softer version first (related genres) before
     dropping it outright, so relaxation degrades gracefully instead of
     abandoning the constraint entirely.
  2. Score every surviving candidate on multiple factors: content
     similarity (TF-IDF cosine), a direct genre-overlap ratio, a
     Bayesian-smoothed rating quality, and popularity — blended so no
     single factor (especially popularity) can dominate the others.
  3. Apply a same-session diversity penalty so back-to-back flips don't
     surface the same director/franchise repeatedly.
  4. Keep the top ~50 as the weighted candidate pool.
  5. Turn scores into a probability distribution (softmax) and sample ONE
     movie from it. This is the "intelligent randomness": the flip feels
     random to the user, but the odds were shaped by the ML step.
"""
from __future__ import annotations

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
BAYESIAN_MIN_VOTES = 200  # "m" in the IMDB-style weighted rating below

# Soft genre compatibility used only when the exact genre pick doesn't
# leave enough candidates — tried BEFORE dropping the genre filter outright,
# so e.g. a thin Sci-Fi pool pulls in Fantasy/Adventure before giving up.
RELATED_GENRES = {
    "Action": ["Adventure", "Thriller", "Crime"],
    "Adventure": ["Action", "Fantasy", "Science Fiction"],
    "Animation": ["Family", "Comedy", "Fantasy"],
    "Comedy": ["Romance", "Family", "Animation"],
    "Crime": ["Thriller", "Drama", "Mystery"],
    "Documentary": ["Drama", "History"],
    "Drama": ["Romance", "Crime", "History"],
    "Family": ["Animation", "Comedy", "Fantasy"],
    "Fantasy": ["Adventure", "Science Fiction", "Animation"],
    "History": ["Drama", "War", "Documentary"],
    "Horror": ["Thriller", "Mystery"],
    "Music": ["Drama", "Comedy"],
    "Mystery": ["Thriller", "Crime", "Horror"],
    "Romance": ["Drama", "Comedy"],
    "Science Fiction": ["Fantasy", "Adventure", "Thriller"],
    "Thriller": ["Crime", "Mystery", "Action"],
    "War": ["History", "Drama", "Action"],
}


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

        # IMDB-style Bayesian weighted rating: pulls low-vote-count scores
        # toward the dataset mean so "9.1 with 50 votes" can't outrank
        # "8.4 with 500,000 votes" on rating quality alone.
        C = self.df.loc[self.df["vote_count"] > 0, "vote_average"].mean()
        v = self.df["vote_count"]
        R = self.df["vote_average"]
        m = BAYESIAN_MIN_VOTES
        self.df["bayesian_rating"] = (v / (v + m)) * R + (m / (v + m)) * C
        self.df["rating_norm"] = self.df["bayesian_rating"] / 10.0

    # ---------------------------------------------------------- filtering
    def _genre_mask(self, mask: pd.Series, genres: list[str]) -> pd.Series:
        return mask & self.df["genres_list"].apply(lambda gs: any(g in gs for g in genres))

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
            genre_mask = self._genre_mask(mask, prefs.genres)
            if genre_mask.sum() >= MIN_POOL_BEFORE_RELAX:
                mask = genre_mask
                applied.append(f"genres={prefs.genres}")
            else:
                # try related genres before giving up on genre entirely
                related = set(prefs.genres)
                for g in prefs.genres:
                    related.update(RELATED_GENRES.get(g, []))
                related_mask = self._genre_mask(mask, list(related))
                if related_mask.sum() >= MIN_POOL_BEFORE_RELAX:
                    mask = related_mask
                    applied.append(f"genres~{sorted(related)}")
                    relaxed.append(f"genres={prefs.genres} (widened to related genres)")
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

    @staticmethod
    def _genre_match_ratio(genres_list: list[str], requested: list[str]) -> float:
        """Fraction of the *requested* genres this movie actually has,
        with a bonus for not being diluted by lots of unrelated genres."""
        if not requested:
            return 0.0
        overlap = len(set(genres_list) & set(requested))
        coverage = overlap / len(requested)
        precision = overlap / max(len(genres_list), 1)
        return 0.7 * coverage + 0.3 * precision

    # ------------------------------------------------------------- scoring
    def build_pool(self, prefs: Preferences, recent_movies: Optional[pd.DataFrame] = None) -> dict:
        mask, applied, relaxed = self._apply_filters(prefs)
        candidate_idx = self.df.index[mask].to_numpy()

        query_vec = self._query_vector(prefs)
        sims = cosine_similarity(query_vec, self.matrix[candidate_idx]).flatten()

        sub = self.df.loc[candidate_idx].copy()
        sub["similarity"] = sims
        sub["genre_match"] = sub["genres_list"].apply(
            lambda gs: self._genre_match_ratio(gs, prefs.genres)
        )

        if prefs.genres:
            sub["ml_score"] = (
                sub["genre_match"] * 0.35
                + sub["similarity"] * 0.30
                + sub["rating_norm"] * 0.20
                + sub["popularity_norm"] * 0.15
            )
        else:
            # no genre picked -> similarity carries mood/nothing, quality leads
            sub["ml_score"] = (
                sub["similarity"] * 0.35
                + sub["rating_norm"] * 0.40
                + sub["popularity_norm"] * 0.25
            )

        # same-session diversity: mildly penalize candidates sharing a
        # director or a lot of keyword overlap with movies already shown
        if recent_movies is not None and len(recent_movies):
            recent_directors = set(recent_movies["director"])
            recent_keywords: set[str] = set()
            for kws in recent_movies["keywords_list"]:
                recent_keywords.update(kws)

            def diversity_penalty(row) -> float:
                penalty = 0.0
                if row["director"] in recent_directors:
                    penalty += 0.08
                if recent_keywords:
                    overlap = len(set(row["keywords_list"]) & recent_keywords)
                    penalty += min(overlap / 10, 0.06)
                return penalty

            sub["ml_score"] = sub["ml_score"] - sub.apply(diversity_penalty, axis=1)

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
        # Each clause reads standalone as "<title> <clause>" — no shared
        # prefix, so it stays grammatical whether one reason fires or five.
        clauses = []
        matched_genres = [g for g in prefs.genres if g in movie["genres_list"]]
        if matched_genres:
            label = " and ".join(g.lower() for g in matched_genres)
            clauses.append(f"matches your pick for {label}")
        if prefs.mood and prefs.mood in MOOD_LEXICON:
            lex = MOOD_LEXICON[prefs.mood]
            if any(g in movie["genres_list"] for g in lex["genres"]) or any(
                kw in " ".join(movie["keywords_list"]).lower() for kw in lex["keywords"]
            ):
                clauses.append(f"fits that '{prefs.mood}' feeling")
        if prefs.min_rating and movie["vote_average"] >= prefs.min_rating:
            clauses.append(f"is rated {movie['vote_average']:.1f}/10, clearing your {prefs.min_rating:.0f}+ bar")
        era_range = ERA_RANGES.get(prefs.era)
        if era_range and era_range[0] <= movie["year"] <= era_range[1]:
            clauses.append(f"is from {movie['year']}, right in your {prefs.era} window")
        rt_range = RUNTIME_RANGES.get(prefs.runtime)
        if rt_range and rt_range[0] <= movie["runtime"] <= rt_range[1]:
            if movie["runtime"] >= 121:
                clauses.append("runs long enough for an 'I have time tonight' watch")
            elif movie["runtime"] <= 89:
                clauses.append("is short and tight, matching your quick-watch pick")
            else:
                clauses.append("lands right in your runtime sweet spot")

        if not clauses:
            return f"{movie['title']} scored highest across your picks once we weighed genre and rating together."

        return f"{movie['title']} " + "; and it ".join(clauses) + "."
