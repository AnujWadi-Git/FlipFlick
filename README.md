# FlipFlick

**Stop scrolling. Flip for a movie.**

FlipFlick is a movie-decision app disguised as a slot machine. You answer
three quick questions — language, genre, mood — and it "flips" to reveal
exactly one movie, with a cinematic reel animation, synthesized sound design,
and a plain-English explanation of why that movie won.

Under the hood the flip isn't a coin toss. It's a content-based recommender
(TF-IDF + cosine similarity over ~5,200 real TMDB movies — including current
2024–2026 releases, scikit-learn) that builds a ranked, weighted candidate
pool from your preferences and then samples one movie from that pool with a
softmax-weighted random draw. The user experiences "random." The odds were
shaped by ML.

> *"Not random. Just unpredictable."*

---

## Why I built it

Most "recommendation" demos are either a static list dressed up as ML, or a
recommender with zero personality. FlipFlick is an attempt at both halves at
once: a recommendation engine I can actually explain in an interview
(features, similarity metric, weighting, evaluation), wrapped in an
interaction designed to be fun enough to film for a 15-second demo.

---

## How the recommendation algorithm works

1. **Feature extraction.** Every movie in the dataset gets a "soup" document:
   overview + tagline + genres + keywords + top cast + director, all lightly
   cleaned. A `TfidfVectorizer` (unigrams + bigrams, English stopwords
   removed, `min_df=2`, 20k max features) turns the whole catalogue into a
   sparse TF-IDF matrix — this is the movie embedding space.
2. **Hard filtering.** Your language and genre picks filter the catalogue.
   (Rating floor / era / runtime filters exist in the backend and API but
   aren't exposed in the UI — the bundled dataset skews older, so asking
   "what decade?" wasn't a reliable question. They still default to "no
   constraint.") If a filter would leave fewer than 15 candidates, it's
   *relaxed* (dropped) rather than returning zero results — see
   [`Recommender._apply_filters`](backend/ml/recommender.py). The UI tells you
   when this happens ("We couldn't find an exact match, so we widened the
   vibe slightly").
3. **Query vector.** Your selected genres and mood get expanded into a
   pseudo-document via a small mood lexicon (e.g. *mind-bending* →
   `Science Fiction`, `Mystery`, `time travel`, `twist ending`, …) and
   embedded through the same TF-IDF vectorizer.
4. **Scoring.** Every surviving candidate gets
   `ml_score = 0.60·cosine_similarity + 0.25·rating_norm + 0.15·popularity_norm`.
   The top 50 by score become the candidate pool.
5. **Weighted random sampling — the "flip."** Pool scores are passed through
   a softmax (`temperature = 0.05`) to get a probability distribution, then
   one movie is drawn with `np.random.choice(pool, p=weights)`. The top pick
   gets roughly a 20–25% chance of being chosen — likely, not guaranteed.
   That's the "intelligent randomness": the *pool* is 100% ML-driven, the
   *draw* is genuinely random.
6. **Explanation.** [`Recommender.explain`](backend/ml/recommender.py) looks
   at which of your actual genre/mood picks the chosen movie satisfies (plus
   rating/era/runtime if those were ever set) and composes a sentence from
   those real matches — nothing is hallucinated by an LLM.

"Flip Again" resamples from the *same* cached pool, excluding movies already
shown this session (falls back to allowing repeats once the pool is
exhausted). "Surprise Me" widens filters to just a quality floor and flattens
the score distribution (`sqrt`) so it's far less predictable while still
staying weighted toward decent movies.

## Dataset

`backend/data/movies_raw.csv` — ~5,200 real movies sourced from TMDB
(title, overview, genres, keywords, cast, crew, runtime, release date,
vote average/count, popularity, spoken languages).

The base of the dataset (~4,800 movies) is a public TMDB export from ~2017,
so it has no recent releases on its own. `ml/fetch_recent_movies.py` fills
that gap: given a `TMDB_API_KEY` in `backend/.env`, it pulls ~470 real
2024–2026 releases straight from the TMDB API (`/discover/movie` +
`/movie/{id}` with credits/keywords) and appends them to `movies_raw.csv` in
the same schema. New rows use a `|` delimiter for cast/keywords instead of
the legacy dataset's ambiguous space-joined format, so cast parsing is exact
for anything added this way. (The legacy ~4,800 rows join cast as
`"First Last First Last ..."` with no delimiter at all;
`ml/preprocessing.py` guesses name boundaries by pairing tokens two at a
time, which breaks for any 3-word name — e.g. "David Lee Smith" gets split
wrong and cascades the rest of that row's cast list. Harmless to
recommendation quality since cast is just one signal in the TF-IDF soup, but
occasionally wrong on the result card's cast list for older movies.)

`ml/preprocessing.py` cleans the raw CSV into `movies_processed.parquet`;
`ml/embeddings.py` builds and caches the TF-IDF artifacts. Re-run both (or
just `python ml/train.py`) after fetching new movies or swapping in a
different dataset — nothing else needs to change. Re-run
`python ml/fetch_recent_movies.py && python ml/train.py` periodically to
keep the catalogue current.

## Architecture

```
flipflick/
├── backend/
│   ├── api/
│   │   ├── main.py            FastAPI app, in-memory session store, endpoints
│   │   ├── schemas.py         Pydantic request/response models
│   │   └── poster_service.py  optional TMDB poster lookup (cached, best-effort)
│   ├── ml/
│   │   ├── preprocessing.py   raw CSV -> cleaned DataFrame + mood lexicon
│   │   ├── embeddings.py      TF-IDF vectorizer + matrix, persisted with joblib
│   │   ├── recommender.py     filtering, scoring, weighted sampling, explanations
│   │   └── train.py           run once to (re)build all ML artifacts
│   ├── data/                  raw + processed dataset
│   └── models/                cached TF-IDF vectorizer/matrix (joblib)
└── frontend/
    └── src/
        ├── app/page.tsx           state machine: idle -> spinning -> result/error
        ├── components/            PreferencesForm, FlipButton, ReelDisplay,
        │                          MovieResultCard, FlipHistory, MLInsightsPanel, ...
        ├── hooks/useFlipSequence  imperative reel choreography, decoupled from the API call
        ├── hooks/useSound         Web Audio API synthesized SFX (no audio files)
        └── lib/                   api client, types, constants, small utils
```

**Why a session store instead of stateless requests:** the first `/api/session`
call does the expensive work (filter + score + build the top-50 pool) once.
"Flip Again" just resamples from that cached pool in memory — no
re-filtering, no re-scoring — which is what keeps every flip after the first
feeling instant.

**Why the animation never waits on the network:** `useFlipSequence` fires the
API request and starts the visual reel in the same tick. The reel spins on
local filler titles for a minimum ~900ms, then a deterministic 6-step
deceleration sequence runs regardless of exactly when the (typically
<50ms, same-process) response lands, ending on the real title. There's no
loading spinner anywhere in the flip — the reel *is* the loading state.

## Sound design

Every sound effect (`frontend/src/hooks/useSound.ts`) is synthesized at
runtime with the Web Audio API — oscillators, filtered noise bursts, gain
envelopes. No audio files, nothing copyrighted, nothing to download. Sound
respects a persisted on/off toggle and the app is fully functional muted.

## ML Insights panel

Click "Show ML insights" under any result to see the actual pipeline output
for that flip: candidate pool size, which filters were applied vs. relaxed,
the top-8 weighted candidates and their scores, the winning movie's
similarity score, and its final sampling probability. This is meant to make
the "not random, just unpredictable" claim verifiable, not just a tagline.

## Setup

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                  # optional: add a TMDB_API_KEY (see below)
cd ml && python train.py && cd ..     # builds movies_processed.parquet + TF-IDF artifacts
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local      # NEXT_PUBLIC_API_URL, defaults to localhost:8000
npm run dev
```

Open http://localhost:3000.

## API configuration

`TMDB_API_KEY` (backend/.env, optional) — FlipFlick works completely without
it: the frontend renders a generated gradient poster card per movie, and the
bundled dataset (with 2024–2026 movies already merged in, see Dataset above)
is used as-is. If set, it's used two ways:

- `api/poster_service.py` opportunistically resolves a real poster image per
  movie from TMDB and caches it in memory for the process lifetime.
- `ml/fetch_recent_movies.py` can be re-run any time to pull newer releases
  into the dataset (see Dataset above).

Get a free key at https://www.themoviedb.org/settings/api.

No other API keys are required — the recommender runs entirely on the local
dataset once fetched.

## Error handling

- Network/backend failure during a flip: the reel animation stops, the UI
  shows a "Reel jammed" state with the error message and a retry button —
  the app never silently hangs on a spinner.
- No movies match the selected filters: filters are progressively relaxed
  server-side (see step 2 above) and the UI surfaces a one-line notice when
  that happens.
- Missing poster: falls back to a generated gradient card, keyed off the
  movie id so it's stable across repeat views.
- Missing trailer: the "Watch Trailer" button always works — it opens a
  YouTube search for `{title} {year} official trailer` rather than depending
  on a trailer API/ID that may not exist for every title.

## Metrics / evaluation notes

The ML Insights panel surfaces per-request signals (similarity score, sample
weight, pool composition) rather than offline Precision@K/Recall@K, since
there's no held-out interaction log to evaluate against (this is a
content-based cold-start recommender, not a collaborative-filtering one). A
natural next step is logging accepted vs. re-flipped movies per session and
computing Precision@1 (did the first flip "stick") as a proxy for
recommendation quality.

## Future improvements

- Swap/extend the TF-IDF features with `sentence-transformers` embeddings
  for semantic (not just lexical) similarity on overviews.
- Log flip outcomes (kept vs. re-flipped) to a real Postgres table and use it
  to learn per-user genre/mood weights over time instead of a flat blend.
- Collaborative-filtering signal once there's real usage data, blended with
  the existing content-based score.
- Real trailer embeds via the YouTube Data API instead of a search-results
  link.
