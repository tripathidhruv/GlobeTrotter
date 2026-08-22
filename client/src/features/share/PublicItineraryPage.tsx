import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { usePublicTrip } from "./useShare";
import type { TripActivity, TripStop } from "./useShare";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function money(n: number) {
  return `$${n.toFixed(0)}`;
}

function activityTotal(activities: TripActivity[]) {
  return activities.reduce((sum, a) => sum + (a.activity?.estCost ?? 0), 0);
}

function shareUrl() {
  return typeof window !== "undefined" ? window.location.href : "";
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(shareUrl());
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="rounded-sm border border-rail/40 bg-ink/40 px-4 py-2 font-mono text-xs uppercase tracking-board text-platform transition-colors hover:border-signal hover:text-signal"
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

function ShareLinks() {
  const url = shareUrl();
  const text = "Check out my trip itinerary";
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <CopyLinkButton />
      <a
        href={twitterHref}
        target="_blank"
        rel="noreferrer"
        className="rounded-sm border border-rail/40 bg-ink/40 px-4 py-2 font-mono text-xs uppercase tracking-board text-platform transition-colors hover:border-signal hover:text-signal"
      >
        Share on X
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="rounded-sm border border-rail/40 bg-ink/40 px-4 py-2 font-mono text-xs uppercase tracking-board text-platform transition-colors hover:border-signal hover:text-signal"
      >
        WhatsApp
      </a>
    </div>
  );
}

function Hero({ trip }: { trip: { name: string; startDate: string; endDate: string; heroImage?: string | null } }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  // Zoom in only, so the hero city closes in as the reader scrolls.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.3]);

  const bg = trip.heroImage ? (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${trip.heroImage})` }}
    />
  ) : (
    <div className="absolute inset-0 bg-board" />
  );

  return (
    <div ref={ref} className="relative flex h-[70vh] min-h-[420px] w-full items-end overflow-hidden bg-ink">
      {reduce ? (
        bg
      ) : (
        <motion.div
          style={{ y, scale }}
          className="absolute inset-0 h-[120%] origin-center will-change-transform"
        >
          {bg}
        </motion.div>
      )}
      <div className="absolute inset-0 bg-ink/70" />
      <div className="relative z-10 w-full px-6 pb-12 sm:px-12">
        <p className="font-mono text-xs uppercase tracking-board text-signal">
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
        </p>
        <h1 className="mt-3 font-display text-5xl uppercase tracking-board text-platform sm:text-7xl">
          {trip.name}
        </h1>
        <div className="mt-6">
          <ShareLinks />
        </div>
      </div>
    </div>
  );
}

function RevealSection({ index, children }: { index: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.08, 0.4) }}
    >
      {children}
    </motion.div>
  );
}

function CityBackground({ imageUrl }: { imageUrl: string | null | undefined }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  // Zoom in only — the city closes in as the section passes, never retreats.
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.34]);
  // Let the photograph brighten as it fills the frame.
  const scrim = useTransform(scrollYProgress, [0, 1], [0.85, 0.6]);

  const img = imageUrl ? (
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
  ) : (
    <div className="absolute inset-0 bg-board" />
  );

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {reduce ? img : (
        <motion.div
          style={{ y, scale }}
          className="absolute inset-0 h-[116%] origin-center will-change-transform"
        >
          {img}
        </motion.div>
      )}
      {reduce ? (
        <div className="absolute inset-0 bg-ink/75" />
      ) : (
        <motion.div style={{ opacity: scrim }} className="absolute inset-0 bg-ink" />
      )}
    </div>
  );
}

function StopSection({ stop, index }: { stop: TripStop; index: number }) {
  const total = activityTotal(stop.activities);
  return (
    <div className="relative isolate overflow-hidden py-16 sm:py-24">
      <CityBackground imageUrl={stop.city.imageUrl} />
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <RevealSection index={index}>
          <div className="flex items-start gap-5">
            <div className="flex flex-shrink-0 flex-col items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-signal bg-signal font-mono text-sm font-bold text-ink">
                {index + 1}
              </div>
              <div className="mt-2 w-px flex-1 bg-rail/40" />
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <h2 className="font-display text-3xl uppercase tracking-board text-platform sm:text-4xl">
                {stop.city.name}
                {stop.city.country ? (
                  <span className="text-mute">, {stop.city.country}</span>
                ) : null}
              </h2>
              <p className="mt-1 font-mono text-xs uppercase tracking-board text-signal">
                {formatDate(stop.arrivalDate)} — {formatDate(stop.departureDate)}
              </p>

              {stop.activities.length > 0 ? (
                <ul className="mt-6 space-y-3">
                  {stop.activities.map((sa) => (
                    <li
                      key={sa.id}
                      className="flex items-baseline justify-between gap-4 rounded-sm border border-rail/30 bg-ink/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-platform">{sa.activity.name}</p>
                        <p className="font-mono text-[11px] uppercase tracking-board text-mute">
                          {sa.activity.category}
                          {sa.scheduledTime ? ` · ${sa.scheduledTime}` : ""}
                        </p>
                      </div>
                      <div className="flex-shrink-0 font-mono text-xs text-platform">
                        {money(sa.activity.estCost)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 font-mono text-xs text-mute">No activities planned yet.</p>
              )}

              {total > 0 ? (
                <p className="mt-4 font-mono text-xs uppercase tracking-board text-mute">
                  Stop total <span className="text-signal">{money(total)}</span>
                </p>
              ) : null}
            </div>
          </div>
        </RevealSection>
      </div>
    </div>
  );
}

export function PublicItineraryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: trip, isLoading, isError } = usePublicTrip(slug);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="font-mono text-xs uppercase tracking-board text-mute">Loading itinerary…</p>
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-ink px-6 text-center">
        <p className="font-display text-2xl uppercase tracking-board text-platform">
          Itinerary not found
        </p>
        <p className="font-mono text-xs text-mute">
          This trip may be private or the link may be incorrect.
        </p>
      </div>
    );
  }

  const heroImage = trip.stops[0]?.city.imageUrl ?? trip.coverPhotoUrl ?? null;

  return (
    <div className="min-h-screen bg-ink">
      <Hero
        trip={{
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          heroImage,
        }}
      />
      <div>
        {trip.stops.map((stop, i) => (
          <StopSection key={stop.id} stop={stop} index={i} />
        ))}
      </div>
      <div className="border-t border-rail/20 px-6 py-10 text-center">
        <ShareLinks />
      </div>
    </div>
  );
}

export default PublicItineraryPage;
