"""
Loads the raw TMDB-derived CSV and turns it into a clean, feature-rich
DataFrame the rest of the ML pipeline can work with.

Source dataset: ~4800 real movies (TMDB metadata: overview, genres,
keywords, cast, crew, runtime, ratings, release dates, spoken languages).
"""
import ast
import re
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RAW_PATH = DATA_DIR / "movies_raw.csv"
PROCESSED_PATH = DATA_DIR / "movies_processed.parquet"

# Mood -> (genre boosts, keyword boosts) used both for the pseudo-document
# built at query time and for a light per-movie mood-affinity precompute.
MOOD_LEXICON = {
    "feel-good": {
        "genres": ["Comedy", "Family", "Animation", "Music"],
        "keywords": ["friendship", "uplifting", "hope", "heartwarming", "musical"],
    },
    "dark": {
        "genres": ["Thriller", "Horror", "Crime", "War"],
        "keywords": ["violence", "death", "murder", "revenge", "corruption", "noir"],
    },
    "emotional": {
        "genres": ["Drama", "Romance"],
        "keywords": ["loss", "grief", "family", "love", "coming of age", "illness"],
    },
    "mind-bending": {
        "genres": ["Science Fiction", "Mystery", "Thriller"],
        "keywords": ["time travel", "dream", "twist ending", "artificial intelligence", "parallel world", "memory"],
    },
    "romantic": {
        "genres": ["Romance"],
        "keywords": ["love", "wedding", "relationship", "romance"],
    },
    "adrenaline": {
        "genres": ["Action", "Adventure", "Thriller"],
        "keywords": ["chase", "explosion", "heist", "survival", "escape"],
    },
    "funny": {
        "genres": ["Comedy"],
        "keywords": ["parody", "satire", "slapstick", "spoof"],
    },
    "cozy": {
        "genres": ["Family", "Animation", "Comedy", "Fantasy"],
        "keywords": ["holiday", "small town", "friendship", "christmas"],
    },
    "weird": {
        "genres": ["Fantasy", "Science Fiction"],
        "keywords": ["surreal", "bizarre", "absurd", "alien", "supernatural"],
    },
}

LANGUAGE_MAP = {
    "english": "en",
    "french": "fr",
    "hindi": "hi",
    "spanish": "es",
    "korean": "ko",
    "japanese": "ja",
    "any language": None,
}


def _safe_literal_list(value, key="name"):
    try:
        items = ast.literal_eval(value) if isinstance(value, str) else []
        return [item[key] for item in items if key in item]
    except (ValueError, SyntaxError):
        return []


def _clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


_UNICODE_ESCAPE_RE = re.compile(r"\\u([0-9a-fA-F]{4})")


def _fix_unicode_escapes(s):
    # legacy dataset rows sometimes store literal "\uXXXX" text (never
    # decoded) instead of the actual character, e.g. "Eugène Lourié"
    # instead of "Eugène Lourié". Decode just those, leaving normal text alone.
    if not isinstance(s, str) or "\\u" not in s:
        return s
    return _UNICODE_ESCAPE_RE.sub(lambda m: chr(int(m.group(1), 16)), s)


def load_and_process() -> pd.DataFrame:
    df = pd.read_csv(RAW_PATH)

    text_cols = ["title", "overview", "tagline", "director", "cast", "keywords", "genres"]
    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].apply(_fix_unicode_escapes)

    df = df[df["title"].notna() & df["overview"].notna()].copy()
    df["overview"] = df["overview"].fillna("")
    df["tagline"] = df["tagline"].fillna("")

    df["genres_list"] = df["genres"].fillna("").apply(lambda s: [g for g in s.split(" ") if g])
    # genres column in this csv is already space separated names, but some
    # multi-word genres ("Science Fiction") got split; repair known cases.
    def fix_genres(raw: str):
        raw = raw or ""
        raw = raw.replace("Science Fiction", "Science-Fiction").replace("TV Movie", "TV-Movie")
        return [g.replace("Science-Fiction", "Science Fiction").replace("TV-Movie", "TV Movie") for g in raw.split(" ") if g]

    df["genres_list"] = df["genres"].fillna("").apply(fix_genres)
    def parse_keywords(raw: str):
        raw = raw or ""
        # newer rows (fetch_recent_movies.py) use "|" so multi-word keywords
        # survive intact; the legacy rows only have naive space-joined tokens.
        if "|" in raw:
            return [k.strip() for k in raw.split("|") if k.strip()]
        return [k for k in raw.split(" ") if k]

    df["keywords_list"] = df["keywords"].fillna("").apply(parse_keywords)

    def parse_cast(raw: str):
        raw = raw or ""
        if "|" in raw:
            return [c.strip() for c in raw.split("|") if c.strip()][:5]
        # legacy CSV joins cast as "First Last First Last ..." with no other
        # delimiter; names are consistently two tokens, so pair them up.
        tokens = [t for t in raw.split(" ") if t]
        pairs = [" ".join(tokens[i:i + 2]) for i in range(0, len(tokens) - 1, 2)]
        return pairs[:5]

    df["cast_list"] = df["cast"].fillna("").apply(parse_cast)

    df["director"] = df["director"].fillna("Unknown")
    df["release_date"] = pd.to_datetime(df["release_date"], errors="coerce")
    df["year"] = df["release_date"].dt.year
    df = df[df["year"].notna()].copy()
    df["year"] = df["year"].astype(int)

    df["runtime"] = pd.to_numeric(df["runtime"], errors="coerce").fillna(0).astype(int)
    df = df[df["runtime"] > 0]

    df["vote_average"] = pd.to_numeric(df["vote_average"], errors="coerce").fillna(0)
    df["vote_count"] = pd.to_numeric(df["vote_count"], errors="coerce").fillna(0)
    df["popularity"] = pd.to_numeric(df["popularity"], errors="coerce").fillna(0)

    df["original_language"] = df["original_language"].fillna("en")

    def spoken_langs(raw):
        names = _safe_literal_list(raw, key="name")
        return names or []

    df["spoken_languages_list"] = df["spoken_languages"].apply(spoken_langs)

    # combined bag-of-words document used for TF-IDF
    df["soup"] = (
        df["overview"].apply(_clean_text) + " "
        + df["tagline"].apply(_clean_text) + " "
        + df["genres_list"].apply(lambda g: " ".join(g).lower() + " " + " ".join(g).lower()) + " "
        + df["keywords_list"].apply(lambda k: " ".join(k).lower()) + " "
        + df["cast_list"].apply(lambda c: " ".join(c).lower()) + " "
        + df["director"].apply(lambda d: _clean_text(d) + " " + _clean_text(d))
    )

    df = df.reset_index(drop=True)
    df["movie_id"] = df.index.astype(str)

    keep_cols = [
        "movie_id", "title", "overview", "tagline", "genres_list", "keywords_list",
        "cast_list", "director", "year", "runtime", "vote_average", "vote_count",
        "popularity", "original_language", "spoken_languages_list", "soup",
    ]
    processed = df[keep_cols].copy()
    processed.to_parquet(PROCESSED_PATH)
    return processed


if __name__ == "__main__":
    out = load_and_process()
    print(f"Processed {len(out)} movies -> {PROCESSED_PATH}")
