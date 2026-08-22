import { motion } from "framer-motion";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-signal text-ink hover:brightness-95",
  secondary: "bg-ink text-platform hover:bg-board",
  ghost: "bg-transparent text-ink border border-rail hover:border-ink",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`rounded-sm px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-board transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit ${variants[variant]} ${className}`}
      {...(props as any)}
    />
  );
}
