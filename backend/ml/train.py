"""Run once (or whenever the dataset changes) to build all ML artifacts."""
from preprocessing import load_and_process
from embeddings import build_embeddings


def main():
    print("Preprocessing raw dataset...")
    df = load_and_process()
    print(f"  {len(df)} movies kept after cleaning.")

    print("Building TF-IDF embeddings...")
    vectorizer, matrix = build_embeddings(df)
    print(f"  TF-IDF matrix shape: {matrix.shape}")

    print("Done.")


if __name__ == "__main__":
    main()
