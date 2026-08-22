import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`overflow-hidden rounded-sm border border-rail bg-white ${className}`}
    >
      {children}
    </motion.div>
  );
}
