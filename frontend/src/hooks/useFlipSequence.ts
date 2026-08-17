"use client";

import { useCallback, useRef, useState } from "react";
import { Recommendation } from "@/lib/types";
import { REEL_FILLER_TITLES } from "@/lib/constants";
import { shuffle, sleep, withTimeout } from "@/lib/utils";
import { SoundApi } from "./useSound";

export type FlipPhase = "idle" | "spinning" | "result" | "error";

const DECEL_DELAYS = [90, 140, 210, 300, 420, 600];

export function useFlipSequence(sound: SoundApi) {
  const [phase, setPhase] = useState<FlipPhase>("idle");
  const [reelTitle, setReelTitle] = useState("");
  const [blur, setBlur] = useState(0);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Recommendation[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const runIdRef = useRef(0);

  const run = useCallback(
    async (apiCall: () => Promise<Recommendation>) => {
      const runId = ++runIdRef.current;
      setPhase("spinning");
      setError(null);
      sound.playWhoosh();

      const apiPromise = apiCall();
      const filler = shuffle(REEL_FILLER_TITLES);

      const fastStart = Date.now();
      let i = 0;
      setBlur(9);
      while (Date.now() - fastStart < 900) {
        if (runIdRef.current !== runId) return;
        setReelTitle(filler[i % filler.length]);
        sound.playTick(0.5);
        i++;
        await sleep(55);
      }

      sound.playTension();

      let apiResult: Recommendation;
      try {
        apiResult = await withTimeout(apiPromise, 6000);
      } catch (e) {
        if (runIdRef.current !== runId) return;
        setPhase("error");
        setError(e instanceof Error ? e.message : "Something went wrong.");
        return;
      }
      if (runIdRef.current !== runId) return;

      const decelTitles = [...shuffle(filler).slice(0, DECEL_DELAYS.length - 1), apiResult.movie.title];
      for (let s = 0; s < decelTitles.length; s++) {
        if (runIdRef.current !== runId) return;
        setReelTitle(decelTitles[s]);
        setBlur(Math.max(0, 9 - s * 1.8));
        const isLast = s === decelTitles.length - 1;
        if (isLast) sound.playImpact();
        else sound.playTick(0.4 + s * 0.12);
        await sleep(DECEL_DELAYS[s]);
      }

      setBlur(0);
      setResult(apiResult);
      sessionIdRef.current = apiResult.session_id;
      sound.playReveal();
      await sleep(350);
      if (runIdRef.current !== runId) return;
      setPhase("result");
      setHistory((prev) => [...prev, apiResult]);
    },
    [sound]
  );

  const reset = useCallback(() => {
    runIdRef.current++;
    setPhase("idle");
    setResult(null);
    setHistory([]);
    sessionIdRef.current = null;
  }, []);

  return { phase, reelTitle, blur, result, error, history, run, reset, sessionIdRef };
}
