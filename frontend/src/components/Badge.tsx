import { ReactNode } from "react";
import clsx from "clsx";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "solid";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest leading-none",
        tone === "default" && "border-hairline text-muted bg-surface/40",
        tone === "accent" && "border-accent/40 text-accent bg-accent/10",
        tone === "solid" && "border-accent bg-accent text-white",
        className
      )}
    >
      {children}
    </span>
  );
}
