import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { City } from "../../features/cities/useCities";

/**
 * Full-bleed city detail popup. Opens from a city tile, closes on Escape,
 * backdrop click, or the close button. Focus moves in on open and returns
 * to whatever was focused before.
 */
export function CityDialog({ city, onClose }: { city: City | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const open = city !== null;

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {city && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="city-dialog-title"
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-sm border border-platform/20 bg-ink text-platform outline-none"
          >
            <div className="relative h-64 sm:h-80">
              {city.imageUrl ? (
                <img src={city.imageUrl} alt="" className="h-full w-full object-cover opacity-80" />
              ) : (
                <div className="h-full w-full bg-board" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />

              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-sm border border-platform/30 bg-ink/60 px-3 py-1.5 font-mono text-xs uppercase text-platform transition-colors hover:border-signal hover:text-signal"
              >
                Close
              </button>

              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-mono text-xs uppercase tracking-board text-signal">
                  {city.region ?? "Destination"}
                </p>
                <h2
                  id="city-dialog-title"
                  className="mt-1 font-display text-4xl uppercase tracking-board sm:text-5xl"
                >
                  {city.name}
                </h2>
                <p className="font-mono text-sm text-platform/70">{city.country}</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-px bg-platform/15 sm:grid-cols-3">
              <div className="bg-ink p-5">
                <dt className="font-mono text-[11px] uppercase tracking-board text-platform/50">
                  Cost index
                </dt>
                <dd className="mt-1 font-mono text-3xl tabular-nums text-signal">
                  {city.costIndex}
                </dd>
              </div>
              <div className="bg-ink p-5">
                <dt className="font-mono text-[11px] uppercase tracking-board text-platform/50">
                  Popularity
                </dt>
                <dd className="mt-1 font-mono text-3xl tabular-nums text-signal">
                  {city.popularityScore}
                </dd>
              </div>
              <div className="col-span-2 bg-ink p-5 sm:col-span-1">
                <dt className="font-mono text-[11px] uppercase tracking-board text-platform/50">
                  Region
                </dt>
                <dd className="mt-1 font-display text-2xl uppercase tracking-board">
                  {city.region ?? "—"}
                </dd>
              </div>
            </dl>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
