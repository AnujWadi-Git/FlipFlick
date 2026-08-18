from typing import Optional

from pydantic import BaseModel, Field


class PreferencesIn(BaseModel):
    language: str = "Any language"
    genres: list[str] = Field(default_factory=list)
    min_rating: float = 0.0
    era: str = "surprise"
    mood: Optional[str] = None
    runtime: str = "surprise"


class FlipIn(BaseModel):
    surprise_me: bool = False


class SurpriseIn(BaseModel):
    # optional: if the caller already has wizard prefs, Surprise Me stays
    # on-topic (wider/wilder sampling) instead of ignoring them entirely.
    language: str = "Any language"
    genres: list[str] = Field(default_factory=list)


class FeedbackIn(BaseModel):
    liked: bool


class MovieOut(BaseModel):
    id: str
    title: str
    year: int
    genres: list[str]
    language: str
    rating: float
    vote_count: int
    runtime: int
    overview: str
    tagline: str
    director: str
    cast: list[str]
    poster_url: Optional[str] = None
    poster_seed: str
    trailer_search_url: str


class MLInsights(BaseModel):
    candidate_pool_size: int
    raw_candidate_count: int
    filters_applied: list[str]
    filters_relaxed: list[str]
    widened: bool
    top_candidates: list[dict]
    similarity_score: float
    sample_weight: float
    randomness_temperature: float


class RecommendationOut(BaseModel):
    session_id: str
    movie: MovieOut
    explanation: str
    widened_notice: Optional[str] = None
    insights: MLInsights
    flip_count: int
