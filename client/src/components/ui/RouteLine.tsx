import { useRef } from "react";
import { motion, useScroll, useReducedMotion } from "framer-motion";

export interface RouteStop {
  id: string;
  label: string;
  meta?: string;
}

export function RouteLine({ stops, compact = false }: { stops: RouteStop[]; compact?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.5"],
  });

  return (
    <ol ref={ref} className="relative m-0 list-none p-0">
      <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-rail" />
      <motion.span
        aria-hidden
        style={{ scaleY: reduce ? 1 : scrollYProgress }}
        className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-signal"
      />
      {stops.map((stop, i) => (
        <li key={stop.id} className={`relative flex gap-4 ${compact ? "py-1.5" : "py-4"}`}>
          <motion.span
            aria-hidden
            initial={reduce ? false : { backgroundColor: "#D3D8DD", scale: 0.8 }}
            whileInView={{ backgroundColor: "#FFB000", scale: 1 }}
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={{ duration: 0.35 }}
            className="mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-platform bg-rail"
          />
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs text-mute">{String(i + 1).padStart(2, "0")}</span>
            <p className={`font-display uppercase tracking-board ${compact ? "text-base" : "text-xl"}`}>
              {stop.label}
            </p>
            {stop.meta && <p className="font-mono text-xs text-mute">{stop.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
