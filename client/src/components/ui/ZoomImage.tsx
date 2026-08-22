import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Background photograph that dollies through the frame as the section scrolls:
 * the city swells toward the viewer, or pulls away, depending on direction.
 * Renders a plain image under reduced motion.
 */
export function ZoomImage({
  src,
  className = "",
  from = 1,
  to = 1.35,
  drift = 6,
}: {
  src: string;
  className?: string;
  /** Scale when the section's top meets the viewport bottom. Keep <= `to` so the image only ever zooms in. */
  from?: number;
  /** Scale once the section has scrolled fully past. */
  to?: number;
  /** Vertical drift in percent, for parallax depth. */
  drift?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [from, to]);
  const y = useTransform(scrollYProgress, [0, 1], [`-${drift}%`, `${drift}%`]);

  if (reduce) {
    return (
      <div ref={ref} className="absolute inset-0 overflow-hidden">
        <img src={src} alt="" className={`h-full w-full object-cover ${className}`} />
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.img
        src={src}
        alt=""
        style={{ scale, y }}
        className={`h-[112%] w-full origin-center object-cover will-change-transform ${className}`}
      />
    </div>
  );
}
