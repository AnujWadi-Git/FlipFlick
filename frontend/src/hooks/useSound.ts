"use client";

import { useCallback, useRef, useState } from "react";

/**
 * All sound effects are synthesized in the browser with the Web Audio API —
 * no external audio files, so nothing copyrighted and nothing to download.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("flipflick-sound");
    return stored === null ? true : stored === "on";
  });

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem("flipflick-sound", next ? "on" : "off");
      return next;
    });
  }, []);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const envGain = (ctx: AudioContext, start: number, peak: number, attack: number, release: number, delay = 0) => {
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + release);
    return gain;
  };

  const playClick = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 900;
    const gain = envGain(ctx, 0, 0.12, 0.005, 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, [enabled, getCtx]);

  const playWhoosh = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.45);
    const gain = envGain(ctx, 0, 0.18, 0.05, 0.4);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
  }, [enabled, getCtx]);

  const playTick = useCallback((intensity = 1) => {
    if (!enabled) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 700 + intensity * 300;
    const gain = envGain(ctx, 0, 0.08 * intensity, 0.002, 0.035);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, [enabled, getCtx]);

  const playTension = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.6);
    const gain = envGain(ctx, 0, 0.06, 0.3, 0.35);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  }, [enabled, getCtx]);

  const playImpact = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.25);
    const gain = envGain(ctx, 0, 0.35, 0.005, 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);

    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = envGain(ctx, 0, 0.15, 0.001, 0.1);
    noise.connect(noiseGain).connect(ctx.destination);
    noise.start();
  }, [enabled, getCtx]);

  const playReveal = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = envGain(ctx, 0, 0.09, 0.05, 0.9, i * 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.05);
      osc.stop(ctx.currentTime + 1.1);
    });
  }, [enabled, getCtx]);

  return { enabled, toggle, playClick, playWhoosh, playTick, playTension, playImpact, playReveal };
}

export type SoundApi = ReturnType<typeof useSound>;
