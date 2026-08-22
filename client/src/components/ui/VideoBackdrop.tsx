import { useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export interface VideoBackdropSource {
  src: string;
  poster?: string;
  label?: string;
}

export function VideoBackdrop({
  sources,
  className = "",
}: {
  sources: VideoBackdropSource[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [errored, setErrored] = useState<Record<number, boolean>>({});

  const usable = sources.filter((_, i) => !errored[i]);

  if (reduce || usable.length === 0) {
    const first = usable[0] ?? sources[0];
    return (
      <div className={`relative overflow-hidden bg-ink ${className}`}>
        {first?.poster ? (
          <img
            src={first.poster}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-ink/70" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-ink ${className}`}>
      {usable.map((source, i) => (
        <VideoLayer
          key={source.src}
          source={source}
          index={i}
          total={usable.length}
          scrollYProgress={scrollYProgress}
          onError={() =>
            setErrored((prev) => ({ ...prev, [sources.indexOf(source)]: true }))
          }
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
    </div>
  );
}

function VideoLayer({
  source,
  index,
  total,
  scrollYProgress,
  onError,
}: {
  source: VideoBackdropSource;
  index: number;
  total: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  onError: () => void;
}) {
  const [failed, setFailed] = useState(false);

  const segment = 1 / total;
  const start = index * segment;
  const end = (index + 1) * segment;
  const fade = segment * 0.25;

  const range =
    total === 1
      ? [0, 1]
      : [
          Math.max(0, start - fade),
          start,
          end - fade,
          Math.min(1, end),
        ];
  const opacityValues =
    total === 1
      ? [1, 1]
      : index === 0
        ? [1, 1, 1, 0]
        : index === total - 1
          ? [0, 1, 1, 1]
          : [0, 1, 1, 0];

  const opacity = useTransform(scrollYProgress, range, opacityValues);

  if (failed) {
    return null;
  }

  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      <video
        className="h-full w-full object-cover [filter:saturate(1.15)_contrast(1.05)]"
        muted
        playsInline
        loop
        autoPlay
        preload="metadata"
        poster={source.poster}
        onError={() => {
          setFailed(true);
          onError();
        }}
      >
        <source src={source.src} type="video/mp4" />
      </video>
    </motion.div>
  );
}
