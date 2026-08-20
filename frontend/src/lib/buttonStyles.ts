import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// Primary (red) buttons use the pearl-glossy shell (see .pearl-btn in
// globals.css) — its 3D highlight is painted by a nested .pearl-wrap
// element, so a primary button needs that wrapper markup, not just a
// className string. Secondary/ghost stay flat, single-element.
export function buttonClass(variant: ButtonVariant, size: ButtonSize = "md", className?: string) {
  return clsx(
    "inline-flex items-center justify-center font-mono uppercase font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    variant === "primary" && "pearl-btn text-white",
    variant === "secondary" &&
      "rounded-full transition-[background-color,border-color,box-shadow,color] duration-200 bg-surface/40 text-foreground/85 border border-hairline hover:border-accent/60 hover:bg-surface/70 hover:text-foreground",
    variant === "ghost" &&
      "font-medium text-muted hover:text-foreground transition-colors underline decoration-dotted underline-offset-4",
    variant !== "ghost" && size === "sm" && "text-[11px] tracking-wide",
    variant !== "ghost" && size === "md" && "text-xs tracking-wide",
    variant !== "ghost" && size === "lg" && "text-base sm:text-lg tracking-[0.12em]",
    variant === "ghost" && "text-xs tracking-wide",
    // secondary carries its own padding directly (no nested wrap needed)
    variant === "secondary" && size === "sm" && "px-4 py-2",
    variant === "secondary" && size === "md" && "px-6 py-3",
    variant === "secondary" && size === "lg" && "px-10 py-4",
    className
  );
}

// Padding for the inner .pearl-wrap span of a primary button.
export function pearlWrapClass(size: ButtonSize = "md") {
  return clsx(
    "pearl-wrap flex items-center justify-center",
    size === "sm" && "px-4 py-2",
    size === "md" && "px-6 py-3",
    size === "lg" && "px-10 py-4"
  );
}
