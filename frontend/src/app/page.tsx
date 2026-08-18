"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IntroTitle } from "@/components/IntroTitle";
import { PreferenceWizard } from "@/components/PreferenceWizard";
import { FlipButton } from "@/components/FlipButton";
import { ReelDisplay } from "@/components/ReelDisplay";
import { MovieResultCard } from "@/components/MovieResultCard";
import { FlipHistory } from "@/components/FlipHistory";
import { SoundToggle } from "@/components/SoundToggle";
import { HomeLogoButton } from "@/components/HomeLogoButton";
import { useSound } from "@/hooks/useSound";
import { useFlipSequence } from "@/hooks/useFlipSequence";
import { startSession, flipAgain, surpriseMe as surpriseMeApi } from "@/lib/api";
import { Preferences, Recommendation } from "@/lib/types";

const DEFAULT_PREFS: Preferences = {
  language: "Any language",
  genres: [],
  min_rating: 0,
  era: "surprise",
  mood: null,
  runtime: "surprise",
};

function summaryChips(prefs: Preferences): string[] {
  const chips: string[] = [prefs.language];
  if (prefs.genres.length) chips.push(prefs.genres.join(", "));
  return chips;
}

export default function Home() {
  const sound = useSound();
  const flip = useFlipSequence(sound);
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [activeRec, setActiveRec] = useState<Recommendation | null>(null);
  const [wizardDone, setWizardDone] = useState(false);

  const handleFlip = () => {
    sound.playClick();
    setActiveRec(null);
    flip.run(() => startSession(prefs));
  };

  const handleFlipAgain = () => {
    sound.playClick();
    setActiveRec(null);
    const sessionId = flip.sessionIdRef.current;
    if (!sessionId) return;
    flip.run(() => flipAgain(sessionId, false));
  };

  const handleSurpriseMe = () => {
    sound.playClick();
    setActiveRec(null);
    // Surprise Me stays on-topic: if a language/genre is already picked,
    // it's still respected — just sampled more unpredictably.
    flip.run(() => surpriseMeApi({ language: prefs.language, genres: prefs.genres }));
  };

  const handleGoHome = () => {
    sound.playClick();
    setActiveRec(null);
    setWizardDone(false);
    setPrefs(DEFAULT_PREFS);
    flip.reset();
  };

  const displayed = activeRec ?? flip.result;

  return (
    <main className="min-h-screen flex flex-col items-center px-5 sm:px-8 py-14 sm:py-20 gap-12">
      <HomeLogoButton onClick={handleGoHome} />
      <SoundToggle enabled={sound.enabled} onToggle={sound.toggle} />

      <AnimatePresence mode="wait">
        {flip.phase === "idle" && !wizardDone && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-12 w-full"
          >
            <IntroTitle />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center text-muted -mt-6 max-w-md text-sm sm:text-base"
            >
              Stop scrolling. Flip for a movie. Tell us what you&apos;re feeling — we&apos;ll make the decision.
            </motion.p>

            <PreferenceWizard prefs={prefs} onChange={setPrefs} onComplete={() => setWizardDone(true)} />

            <button
              onClick={handleSurpriseMe}
              className="font-mono text-xs uppercase tracking-wide text-muted hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
            >
              Or skip the questions — Surprise Me
            </button>
          </motion.div>
        )}

        {flip.phase === "idle" && wizardDone && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 w-full mt-16"
          >
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-accent">Ready to flip</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg font-mono text-xs uppercase tracking-wide">
              {summaryChips(prefs).map((c) => (
                <span key={c} className="px-3 py-1.5 rounded-full border border-hairline text-foreground/75">
                  {c}
                </span>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 pt-4">
              <FlipButton onClick={handleFlip} />
              <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wide">
                <button
                  onClick={() => setWizardDone(false)}
                  className="text-muted hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
                >
                  ← Edit preferences
                </button>
                <button
                  onClick={handleSurpriseMe}
                  className="text-muted hover:text-foreground transition-colors underline decoration-dotted underline-offset-4"
                >
                  Surprise Me
                </button>
              </div>
              <p className="font-mono text-[11px] text-muted/70 max-w-xs text-center pt-2">
                The flip is random. The choices aren&apos;t.
              </p>
            </div>
          </motion.div>
        )}

        {flip.phase === "spinning" && (
          <motion.div
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-10 w-full mt-24"
          >
            <p className="font-mono text-xs sm:text-sm text-muted tracking-[0.3em] uppercase animate-flicker">
              Flipping through the reel…
            </p>
            <ReelDisplay title={flip.reelTitle} blur={flip.blur} landed={flip.blur === 0} />
            <FlipButton onClick={() => {}} disabled spinning />
          </motion.div>
        )}

        {flip.phase === "result" && flip.result && displayed && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center w-full gap-4"
          >
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent">Not random. Just unpredictable.</p>
            <MovieResultCard rec={displayed} onFlipAgain={handleFlipAgain} onSurpriseMe={handleSurpriseMe} />
            <FlipHistory history={flip.history} activeId={displayed.movie.id} onSelect={setActiveRec} />
          </motion.div>
        )}

        {flip.phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 mt-24 text-center max-w-md"
          >
            <p className="font-display text-3xl text-cue">Reel jammed.</p>
            <p className="font-mono text-xs text-muted">{flip.error || "Something went wrong talking to the recommender."}</p>
            <FlipButton onClick={handleFlip} label="Try Again" />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
