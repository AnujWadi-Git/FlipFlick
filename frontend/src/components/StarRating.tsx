"use client";

import { useState } from "react";
import { submitReview } from "@/lib/api";

export function StarRating() {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleClick = async (stars: number) => {
    if (submitting || submitted) return;
    setSelected(stars);
    setSubmitting(true);
    try {
      await submitReview(stars);
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="border border-hairline px-3 py-2 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent-solid">
          Thanks for rating this pick
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border border-hairline px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent">How accurate?</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={submitting}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleClick(star)}
            className={`text-lg leading-none transition-colors disabled:opacity-50 ${
              star <= (hovered || selected) ? "text-accent-solid" : "text-hairline"
            }`}
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
