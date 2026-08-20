// Darkens the edges of the viewport so the center reads like it's lit by
// a screen in a dark room, instead of the whole page sitting at one flat
// brightness. Pure CSS, static — no animation cost.
export function Vignette() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[1] pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 80% 65% at 50% 38%, transparent 0%, transparent 35%, rgba(0,0,0,0.55) 100%)",
      }}
    />
  );
}
