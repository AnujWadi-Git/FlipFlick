export interface Movie {
  id: string;
  title: string;
  year: number;
  genres: string[];
  language: string;
  rating: number;
  vote_count: number;
  runtime: number;
  overview: string;
  tagline: string;
  director: string;
  cast: string[];
  poster_url: string | null;
  poster_seed: string;
  trailer_search_url: string;
}

export interface MLInsights {
  candidate_pool_size: number;
  raw_candidate_count: number;
  filters_applied: string[];
  filters_relaxed: string[];
  widened: boolean;
  top_candidates: { title: string; score: number }[];
  similarity_score: number;
  sample_weight: number;
  randomness_temperature: number;
}

export interface Recommendation {
  session_id: string;
  movie: Movie;
  explanation: string;
  widened_notice: string | null;
  insights: MLInsights;
  flip_count: number;
}

export interface Preferences {
  language: string;
  genres: string[];
  min_rating: number;
  era: string;
  mood: string | null;
  runtime: string;
}
