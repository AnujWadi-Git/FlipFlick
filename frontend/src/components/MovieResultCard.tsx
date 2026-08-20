"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Recommendation } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { StarRating } from "./StarRating";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { buttonClass } from "@/lib/buttonStyles";

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
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSpotlight = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--spot-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

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

      <div
        ref={cardRef}
        onMouseMove={handleSpotlight}
        className="group relative overflow-hidden border border-hairline bg-surface/60 backdrop-blur-sm transition-[box-shadow,border-color] duration-500 hover:border-accent/40 hover:shadow-[0_0_60px_-15px_rgba(218,41,28,0.35)]"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(218,41,28,0.08), transparent 70%)",
          }}
        />
        <div className="grid sm:grid-cols-[minmax(0,240px)_1fr]">
          {/* poster */}
          <div
            className="relative aspect-[2/3] sm:aspect-auto sm:h-full min-h-[220px] flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-hairline"
            style={{ background: movie.poster_url ? undefined : `linear-gradient(155deg, ${colorA}, ${colorB})` }}
          >
            {movie.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent sm:hidden" />
          </div>

          {/* details */}
          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-accent mb-1.5">The movie tonight</p>
              <h2 className="font-cinematic text-5xl sm:text-6xl">{movie.title}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge>{movie.year}</Badge>
              {movie.genres.slice(0, 3).map((g) => (
                <Badge key={g}>{g}</Badge>
              ))}
              <Badge>{LANGUAGE_NAMES[movie.language] || movie.language.toUpperCase()}</Badge>
              <Badge>{formatRuntime(movie.runtime)}</Badge>
            </div>

            <div className="flex items-center gap-4 border border-hairline bg-background/40 px-4 py-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-bold text-3xl text-accent-solid leading-none">
                  <AnimatedNumber value={movie.rating} />
                </span>
                <span className="font-mono text-xs text-muted">/10</span>
              </div>
              <div className="h-8 w-px bg-hairline" />
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted leading-tight">
                <p>Audience Score</p>
                <p className="text-foreground/60">{movie.vote_count.toLocaleString()} votes</p>
              </div>
            </div>

            {movie.tagline && <p className="font-display text-foreground/70 text-base">&ldquo;{movie.tagline}&rdquo;</p>}
            <p className="text-sm leading-relaxed text-foreground/80 line-clamp-4">{movie.overview}</p>

            <div className="font-mono text-xs text-muted space-y-1">
              <p><span className="text-foreground/60">Director</span> — {movie.director}</p>
              {movie.cast.length > 0 && (
                <p><span className="text-foreground/60">Cast</span> — {movie.cast.join(", ")}</p>
              )}
            </div>

            <div className="border-l-2 border-accent bg-background/40 p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent mb-1.5">Why this movie?</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{rec.explanation}</p>
            </div>

            <StarRating key={movie.id} />

            <div className="flex flex-wrap gap-3 pt-1">
              <motion.a
                href={movie.trailer_search_url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={buttonClass("secondary", "md")}
              >
                ▶ Watch Trailer
              </motion.a>
              <Button onClick={onFlipAgain} disabled={flipDisabled} variant="primary" size="md">
                ↻ Flip Again
              </Button>
              <Button onClick={onSurpriseMe} disabled={flipDisabled} variant="secondary" size="md">
                ⚄ Surprise Me
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
