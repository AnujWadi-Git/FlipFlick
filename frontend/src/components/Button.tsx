"use client";

import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { buttonClass, type ButtonVariant, type ButtonSize } from "@/lib/buttonStyles";

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
} & Omit<HTMLMotionProps<"button">, "children">;

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", className, children, disabled, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={!disabled ? { y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {children}
    </motion.button>
  );
});
