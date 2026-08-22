import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Full-bleed scenery band: a city photograph that drifts vertically as it
 * passes through the viewport, with an ink scrim so overlaid text stays legible.
 */
export function SceneryBand({
  imageUrl,
  eyebrow,
  title,
  caption,
}: {
  imageUrl?: string | null;
  eyebrow?: string;
  title: string;
  caption?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Drift the image opposite the scroll direction for depth.
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const scrimOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 0.55, 0.85]);

  return (
    <section
      ref={ref}
      className="relative isolate flex h-[60vh] min-h-[380px] items-center overflow-hidden bg-ink text-platform"
    >
      {imageUrl &&
        (reduce ? (
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <motion.img
            src={imageUrl}
            alt=""
            style={{ y }}
            className="absolute inset-0 h-[124%] w-full object-cover"
          />
        ))}

      {reduce ? (
        <div className="absolute inset-0 bg-ink/75" />
      ) : (
        <motion.div style={{ opacity: scrimOpacity }} className="absolute inset-0 bg-ink" />
      )}

      <div className="relative mx-auto w-full max-w-6xl px-6">
        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-board text-signal">{eyebrow}</p>
        )}
        <h2 className="mt-3 max-w-2xl font-display text-4xl uppercase leading-[0.95] tracking-board sm:text-6xl">
          {title}
        </h2>
        {caption && <p className="mt-4 max-w-md text-platform/70">{caption}</p>}
      </div>
    </section>
  );
}
