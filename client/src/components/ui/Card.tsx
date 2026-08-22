import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const classes = `overflow-hidden rounded-sm border border-rail bg-white ${className}`;

  if (reduce) {
    return <div className={classes}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={classes}
    >
      {children}
    </motion.div>
  );
}
