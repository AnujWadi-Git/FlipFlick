import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

// One shared visual language for every interactive control on the site —
// flat surfaces, a single soft shadow (not a glossy 3D dome), consistent
// radius and motion. Deliberately restrained: this is what actually reads
// as premium/considered rather than a toy.
export function buttonClass(variant: ButtonVariant, size: ButtonSize = "md", className?: string) {
  return clsx(
    variant !== "ghost" &&
      "inline-flex items-center justify-center rounded-full font-mono uppercase font-semibold transition-[background-color,border-color,box-shadow,color] duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
    variant === "ghost" &&
      "inline-flex items-center font-mono uppercase font-medium text-muted hover:text-foreground transition-colors underline decoration-dotted underline-offset-4 disabled:opacity-40 disabled:pointer-events-none",
    variant !== "ghost" && size === "sm" && "px-4 py-2 text-[11px] tracking-wide",
    variant !== "ghost" && size === "md" && "px-6 py-3 text-xs tracking-wide",
    variant !== "ghost" && size === "lg" && "px-10 py-4 text-base sm:text-lg tracking-[0.12em]",
    variant === "ghost" && "text-xs tracking-wide",
    variant === "primary" &&
      "bg-accent text-white border border-accent/70 shadow-[0_6px_20px_-6px_rgba(218,41,28,0.55)] hover:bg-accent-hover hover:border-accent-hover hover:shadow-[0_10px_30px_-6px_rgba(218,41,28,0.7)]",
    variant === "secondary" &&
      "bg-surface/40 text-foreground/85 border border-hairline hover:border-accent/60 hover:bg-surface/70 hover:text-foreground",
    className
  );
}
