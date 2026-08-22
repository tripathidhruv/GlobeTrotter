import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Per-route wrapper that gives AnimatePresence something to animate.
 * AnimatePresence can only cross-fade routes if each route's element is a
 * motion component that actually mounts and unmounts with the location key.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
