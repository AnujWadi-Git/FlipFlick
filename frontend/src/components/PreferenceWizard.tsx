"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Preferences } from "@/lib/types";
import { GENRES, LANGUAGES } from "@/lib/constants";
import { Pill } from "./Pill";
import { Button } from "./Button";

type StepKey = "language" | "genre";

interface Step {
  key: StepKey;
  question: string;
  subtitle?: string;
  multi?: boolean;
  optional?: boolean;
}

const STEPS: Step[] = [
  { key: "language", question: "What language?" },
  { key: "genre", question: "What genre?", subtitle: "Pick as many as you like", multi: true },
];

const AUTO_ADVANCE_DELAY = 260;

export function PreferenceWizard({
  prefs,
  onChange,
  onComplete,
}: {
  prefs: Preferences;
  onChange: (next: Preferences) => void;
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  // Tracks which steps the user has actually interacted with, so an option
  // that merely matches the default value doesn't render as "pre-selected."
  const [touched, setTouched] = useState<Partial<Record<StepKey, boolean>>>({});
  const step = STEPS[stepIndex];

  const goTo = (nextIndex: number, dir: number) => {
    setDirection(dir);
    if (nextIndex >= STEPS.length) {
      onComplete();
    } else {
      setStepIndex(nextIndex);
    }
  };

  const advance = () => {
    setTimeout(() => goTo(stepIndex + 1, 1), AUTO_ADVANCE_DELAY);
  };

  const back = () => {
    if (stepIndex === 0) return;
    goTo(stepIndex - 1, -1);
  };

  const toggleGenre = (g: string) => {
    setTouched((t) => ({ ...t, genre: true }));
    const has = prefs.genres.includes(g);
    onChange({ ...prefs, genres: has ? prefs.genres.filter((x) => x !== g) : [...prefs.genres, g] });
  };

  const selectSingle = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setTouched((t) => ({ ...t, [step.key]: true }));
    onChange({ ...prefs, [key]: value });
    advance();
  };

  return (
    <div className="w-full max-w-2xl flex flex-col items-center gap-10">
      {/* progress */}
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
        <span>{String(stepIndex + 1).padStart(2, "0")}</span>
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-[3px] rounded-full transition-all duration-300 ${
                i === stepIndex ? "w-8 bg-accent" : i < stepIndex ? "w-4 bg-accent" : "w-4 bg-hairline"
              }`}
            />
          ))}
        </div>
        <span>{String(STEPS.length).padStart(2, "0")}</span>
      </div>

      <div className="w-full flex flex-col items-center border border-hairline bg-surface/30 backdrop-blur-sm px-6 py-10 sm:px-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.key}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-full flex flex-col items-center gap-8"
          >
            <div className="text-center space-y-2">
              <h2 className="font-display text-4xl sm:text-5xl">{step.question}</h2>
              {step.subtitle && <p className="font-mono text-xs uppercase tracking-widest text-muted">{step.subtitle}</p>}
            </div>

            {step.key === "language" && (
              <div className="flex flex-nowrap justify-center gap-1.5 sm:gap-2.5 w-full px-1">
                {LANGUAGES.map((l) => (
                  <Pill
                    key={l}
                    label={l}
                    compact
                    selected={!!touched.language && prefs.language === l}
                    onClick={() => selectSingle("language", l)}
                  />
                ))}
              </div>
            )}

            {step.key === "genre" && (
              <div className="flex flex-wrap justify-center gap-3 max-w-xl">
                {GENRES.map((g) => (
                  <Pill key={g} label={g} selected={prefs.genres.includes(g)} onClick={() => toggleGenre(g)} />
                ))}
              </div>
            )}

            {(stepIndex > 0 || step.multi || step.optional) && (
              <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wide">
                {stepIndex > 0 && (
                  <button onClick={back} className="text-muted hover:text-foreground transition-colors">
                    ← Back
                  </button>
                )}

                {step.multi && (
                  <Button onClick={() => goTo(stepIndex + 1, 1)} variant="primary" size="md">
                    Continue
                  </Button>
                )}

                {step.optional && (
                  <button
                    onClick={() => goTo(stepIndex + 1, 1)}
                    className="text-muted hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
                  >
                    Skip
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
