"use client";

import { motion } from "framer-motion";
import { Recommendation } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { StarRating } from "./StarRating";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", fr: "French", hi: "Hindi", es: "Spanish", ko: "Korean",
  ja: "Japanese", zh: "Chinese", de: "German", it: "Italian", ru: "Russian",
};

function formatRuntime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function MovieResultCard({
  rec,
  onFlipAgain,
  onSurpriseMe,
  flipDisabled,
}: {
  rec: Recommendation;
  onFlipAgain: () => void;
  onSurpriseMe: () => void;
  flipDisabled?: boolean;
}) {
  const { movie } = rec;
  const [colorA, colorB] = movie.poster_seed.split(",");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="w-full max-w-4xl mx-auto"
    >
      {rec.widened_notice && (
        <p className="text-center font-mono text-xs tracking-wide text-accent/80 mb-4">{rec.widened_notice}</p>
      )}

      <div className="overflow-hidden border border-hairline bg-surface/60">
        <div className="grid sm:grid-cols-[minmax(0,240px)_1fr]">
          {/* poster */}
          <div
            className="relative aspect-[2/3] sm:aspect-auto sm:h-full min-h-[220px] flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-hairline"
            style={{ background: movie.poster_url ? undefined : `linear-gradient(155deg, ${colorA}, ${colorB})` }}
          >
            {movie.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={movie.poster_url} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <span className="font-display text-3xl text-white/40 select-none text-center px-4">
                  {movie.title}
                </span>
                <span className="absolute bottom-3 left-3 right-3 font-mono text-[10px] uppercase tracking-widest text-white/60">
                  {movie.genres[0]}
                </span>
              </>
            )}
          </div>

          {/* details */}
          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-accent mb-1.5">The movie tonight</p>
              <h2 className="font-display font-medium text-4xl sm:text-5xl leading-none">{movie.title}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
              <span>{movie.year}</span>
              <span>·</span>
              <span>{movie.genres.slice(0, 3).join(", ")}</span>
              <span>·</span>
              <span>{LANGUAGE_NAMES[movie.language] || movie.language.toUpperCase()}</span>
              <span>·</span>
              <span>{formatRuntime(movie.runtime)}</span>
            </div>

            <div className="flex items-center gap-2 border-y border-hairline py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Rating</span>
              <span className="font-display font-bold text-2xl text-accent-solid">
                <AnimatedNumber value={movie.rating} />/10
              </span>
              <span className="font-mono text-[10px] text-muted">({movie.vote_count.toLocaleString()} votes)</span>
            </div>

            {movie.tagline && <p className="font-display text-foreground/70 text-base">&ldquo;{movie.tagline}&rdquo;</p>}
            <p className="text-sm leading-relaxed text-foreground/80 line-clamp-4">{movie.overview}</p>

            <div className="font-mono text-xs text-muted space-y-1">
              <p><span className="text-foreground/60">Director</span> — {movie.director}</p>
              {movie.cast.length > 0 && (
                <p><span className="text-foreground/60">Cast</span> — {movie.cast.join(", ")}</p>
              )}
            </div>

            <div className="border border-hairline p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent mb-1.5">Why this movie?</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{rec.explanation}</p>
            </div>

            <StarRating key={movie.id} />

            <div className="flex flex-wrap gap-3 pt-1 font-mono text-xs uppercase tracking-wide font-semibold">
              <a
                href={movie.trailer_search_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 border border-hairline text-foreground/85 hover:border-accent hover:text-foreground transition-colors"
              >
                ▶ Watch Trailer
              </a>
              <button
                onClick={onFlipAgain}
                disabled={flipDisabled}
                className="px-5 py-3 border border-accent bg-accent text-white hover:bg-accent-hover hover:border-accent-hover transition-colors disabled:opacity-40"
              >
                ↻ Flip Again
              </button>
              <button
                onClick={onSurpriseMe}
                disabled={flipDisabled}
                className="px-5 py-3 border border-hairline text-foreground/85 hover:border-accent hover:text-foreground transition-colors disabled:opacity-40"
              >
                ⚄ Surprise Me
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
