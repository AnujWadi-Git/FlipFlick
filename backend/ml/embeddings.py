"""
Builds a TF-IDF feature space over each movie's "soup" document
(overview + tagline + genres + keywords + cast + director) and persists
the vectorizer + matrix so the API can load them instantly at startup
instead of recomputing on every boot.
"""
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

from preprocessing import PROCESSED_PATH

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
MATRIX_PATH = MODELS_DIR / "tfidf_matrix.joblib"


def build_embeddings(df: pd.DataFrame):
    MODELS_DIR.mkdir(exist_ok=True, parents=True)
    vectorizer = TfidfVectorizer(
        max_features=20000,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
    )
    matrix = vectorizer.fit_transform(df["soup"])
    joblib.dump(vectorizer, VECTORIZER_PATH)
    joblib.dump(matrix, MATRIX_PATH)
    return vectorizer, matrix


def load_embeddings():
    vectorizer = joblib.load(VECTORIZER_PATH)
    matrix = joblib.load(MATRIX_PATH)
    return vectorizer, matrix


if __name__ == "__main__":
    df = pd.read_parquet(PROCESSED_PATH)
    vec, mat = build_embeddings(df)
    print(f"TF-IDF matrix: {mat.shape} -> saved to {MODELS_DIR}")
