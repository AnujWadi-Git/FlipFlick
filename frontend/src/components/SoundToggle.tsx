"use client";

export function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border border-hairline hover:border-accent-dim font-mono text-[11px] uppercase tracking-wide transition-colors"
      aria-label={enabled ? "Mute sound" : "Unmute sound"}
    >
      <span className={enabled ? "text-accent" : "text-muted"}>{enabled ? "●" : "○"}</span>
      <span className="hidden sm:inline text-muted">{enabled ? "Sound On" : "Sound Off"}</span>
    </button>
  );
}
