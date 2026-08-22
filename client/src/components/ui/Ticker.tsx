import { motion, useReducedMotion } from "framer-motion";

/**
 * Departure-board ticker: an endless horizontal crawl of destination names.
 * Duplicated once so the loop is seamless at any width.
 */
export function Ticker({ items, speed = 40 }: { items: string[]; speed?: number }) {
  const reduce = useReducedMotion();
  if (items.length === 0) return null;

  const row = [...items, ...items];

  const content = (
    <div className="flex shrink-0 items-center gap-8 px-4">
      {row.map((item, i) => (
        <span key={i} className="flex items-center gap-8 whitespace-nowrap">
          <span className="font-display text-sm uppercase tracking-board text-platform/70">
            {item}
          </span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-signal" />
        </span>
      ))}
    </div>
  );

  if (reduce) {
    return (
      <div className="overflow-hidden border-y border-platform/15 bg-ink py-3">
        <div className="flex">{content}</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border-y border-platform/15 bg-ink py-3">
      <motion.div
        className="flex w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {content}
        {content}
      </motion.div>
    </div>
  );
}
