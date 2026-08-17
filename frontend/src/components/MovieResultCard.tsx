"use client";

import { motion } from "framer-motion";
import { Recommendation } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";

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
        <p className="text-center text-xs text-accent-2/90 mb-4">{rec.widened_notice}</p>
      )}

      <div className="rounded-3xl overflow-hidden border border-white/[0.06] bg-surface/60 backdrop-blur-sm shadow-[0_30px_120px_rgba(0,0,0,0.6)]">
        <div className="grid sm:grid-cols-[minmax(0,240px)_1fr]">
          {/* poster */}
          <div
            className="relative aspect-[2/3] sm:aspect-auto sm:h-full min-h-[220px] flex items-center justify-center overflow-hidden"
            style={{ background: movie.poster_url ? undefined : `linear-gradient(155deg, ${colorA}, ${colorB})` }}
          >
            {movie.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={movie.poster_url} alt={movie.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <span className="text-6xl opacity-30 select-none">🎬</span>
                <span className="absolute bottom-3 left-3 right-3 text-xs uppercase tracking-widest text-white/70">
                  {movie.genres[0]}
                </span>
              </>
            )}
          </div>

          {/* details */}
          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-accent font-semibold mb-1">The movie tonight</p>
              <h2 className="font-display text-4xl sm:text-5xl leading-none">{movie.title}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{movie.year}</span>
              <span>·</span>
              <span>{movie.genres.slice(0, 3).join(", ")}</span>
              <span>·</span>
              <span>{LANGUAGE_NAMES[movie.language] || movie.language.toUpperCase()}</span>
              <span>·</span>
              <span>{formatRuntime(movie.runtime)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-accent-2 text-lg">⭐</span>
              <span className="font-display text-2xl">
                <AnimatedNumber value={movie.rating} />/10
              </span>
              <span className="text-xs text-muted">({movie.vote_count.toLocaleString()} votes)</span>
            </div>

            {movie.tagline && <p className="italic text-foreground/70 text-sm">&ldquo;{movie.tagline}&rdquo;</p>}
            <p className="text-sm leading-relaxed text-foreground/80 line-clamp-4">{movie.overview}</p>

            <div className="text-xs text-muted space-y-1">
              <p><span className="text-foreground/60">Director:</span> {movie.director}</p>
              {movie.cast.length > 0 && (
                <p><span className="text-foreground/60">Cast:</span> {movie.cast.join(", ")}</p>
              )}
            </div>

            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
              <p className="text-xs uppercase tracking-widest text-accent-2 mb-1.5 font-semibold">Why this movie?</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{rec.explanation}</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={movie.trailer_search_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:scale-105 transition-transform"
              >
                ▶ Watch Trailer
              </a>
              <button
                onClick={onFlipAgain}
                disabled={flipDisabled}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accent to-accent-2 text-black text-sm font-semibold hover:scale-105 transition-transform disabled:opacity-50"
              >
                🔁 Flip Again
              </button>
              <button
                onClick={onSurpriseMe}
                disabled={flipDisabled}
                className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-sm font-medium transition-colors disabled:opacity-50"
              >
                🎲 Surprise Me
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
