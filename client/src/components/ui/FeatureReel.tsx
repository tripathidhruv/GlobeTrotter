import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export interface ReelItem {
  src: string;
  label: string;
  meta?: string;
  poster?: string;
}

/**
 * Framed "now showing" reel: one clip at a time, cross-fading on a timer.
 * Falls back to the poster image under reduced motion or if a clip fails.
 */
export function FeatureReel({ items, interval = 5200 }: { items: ReelItem[]; interval?: number }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  const usable = items.filter((_, i) => !failed[i]);
  const current = usable[index % Math.max(1, usable.length)];

  useEffect(() => {
    if (reduce || usable.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % usable.length), interval);
    return () => clearInterval(id);
  }, [reduce, usable.length, interval]);

  if (!current) return null;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-platform/25 bg-ink sm:aspect-[3/4]">
      <AnimatePresence mode="sync">
        <motion.div
          key={current.src}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {reduce ? (
            current.poster && (
              <img src={current.poster} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <video
              className="h-full w-full object-cover"
              src={current.src}
              poster={current.poster}
              muted
              playsInline
              loop
              autoPlay
              preload="metadata"
              onError={() =>
                setFailed((prev) => ({ ...prev, [items.indexOf(current)]: true }))
              }
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Legibility scrim for the caption */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />

      {/* Frame corners — timetable/viewfinder detail */}
      <span aria-hidden className="absolute left-3 top-3 h-5 w-5 border-l border-t border-signal" />
      <span aria-hidden className="absolute right-3 top-3 h-5 w-5 border-r border-t border-signal" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-board text-platform/80">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-signal" />
          Now showing
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.label}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.45 }}
          >
            <p className="font-display text-3xl uppercase tracking-board text-platform">
              {current.label}
            </p>
            {current.meta && (
              <p className="font-mono text-[11px] uppercase text-platform/70">{current.meta}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress pips */}
        <div className="mt-4 flex gap-1.5">
          {usable.map((item, i) => (
            <span
              key={item.src}
              aria-hidden
              className={`h-[2px] flex-1 transition-colors duration-500 ${
                i === index % usable.length ? "bg-signal" : "bg-platform/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
