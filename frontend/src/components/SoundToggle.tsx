"use client";

export function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] backdrop-blur-md text-xs font-medium transition-colors"
      aria-label={enabled ? "Mute sound" : "Unmute sound"}
    >
      <span>{enabled ? "🔊" : "🔇"}</span>
      <span className="hidden sm:inline text-muted">{enabled ? "Sound ON" : "Sound OFF"}</span>
    </button>
  );
}
