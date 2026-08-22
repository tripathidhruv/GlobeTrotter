import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useTrip, type TripActivity, type TripStop } from "./useTrip";
import { CollaboratorsPanel } from "../collaborators/CollaboratorsPanel";

type ViewMode = "timeline" | "city";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function money(n: number) {
  return `$${n.toFixed(0)}`;
}

function stopDayKeys(stop: TripStop): string[] {
  const start = new Date(stop.arrivalDate);
  const end = new Date(stop.departureDate);
  const days: string[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  if (last < cur) return [cur.toISOString().slice(0, 10)];
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function activityTotal(activities: TripActivity[]) {
  return activities.reduce((sum, a) => sum + (a.activity?.estCost ?? 0), 0);
}

function tripTotal(stops: TripStop[]) {
  return stops.reduce((sum, s) => sum + activityTotal(s.activities), 0);
}

function ActivityRow({
  sa,
  index,
  reduce,
}: {
  sa: TripActivity;
  index: number;
  reduce: boolean;
}) {
  const content = (
    <div className="group flex items-baseline justify-between gap-4 border-b border-rail/40 py-2.5 transition-colors hover:border-signal">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink transition-colors group-hover:text-transit">
          {sa.activity.name}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-board text-mute">
          {sa.activity.category}
          {sa.scheduledTime ? ` · ${sa.scheduledTime}` : ""}
        </p>
      </div>
      <div className="flex-shrink-0 text-right font-mono text-xs text-mute">
        <div>{sa.activity.estDurationMinutes}min</div>
        <div className="text-ink">{money(sa.activity.estCost)}</div>
      </div>
    </div>
  );

  if (reduce) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
}

function StopNode({ index, reduce }: { index: number; reduce: boolean }) {
  const label = String(index + 1).padStart(2, "0");
  const classes =
    "relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-signal font-mono text-xs font-bold text-ink";
  if (reduce) return <span className={classes}>{label}</span>;
  return (
    <motion.span
      className={classes}
      initial={{ scale: 0.5, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 380, damping: 24 }}
    >
      {label}
    </motion.span>
  );
}

function CityScenery({
  imageUrl,
  reduce,
}: {
  imageUrl: string | null;
  reduce: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  if (!imageUrl) return null;

  if (reduce) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-15"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
    );
  }

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-[-10%] bg-cover bg-center opacity-15"
        style={{ backgroundImage: `url(${imageUrl})`, y }}
      />
    </div>
  );
}

function StopSection({
  stop,
  index,
  reduce,
}: {
  stop: TripStop;
  index: number;
  reduce: boolean;
}) {
  const total = activityTotal(stop.activities);
  const heading = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="truncate font-display text-2xl uppercase tracking-board text-ink sm:text-3xl">
          {stop.city.name}
        </h2>
        <p className="font-mono text-xs uppercase tracking-board text-mute">
          {stop.city.country}
          {stop.city.region ? ` · ${stop.city.region}` : ""}
        </p>
        <p className="mt-1 font-mono text-xs text-mute">
          {formatDate(stop.arrivalDate)} <span className="text-rail">→</span>{" "}
          {formatDate(stop.departureDate)}
        </p>
      </div>
      <div className="flex-shrink-0 text-right font-mono text-xs text-mute">
        <div className="uppercase tracking-board">Stop total</div>
        <div className="text-lg text-signal">{money(total)}</div>
      </div>
    </div>
  );

  const body = (
    <div className="relative overflow-hidden rounded-sm border border-rail bg-platform p-5 sm:p-7">
      <CityScenery imageUrl={stop.city.imageUrl} reduce={reduce} />
      <div className="relative flex gap-4">
        <StopNode index={index} reduce={reduce} />
        <div className="min-w-0 flex-1">
          {heading}
          {stop.activities.length > 0 ? (
            <div className="mt-4 divide-y divide-transparent">
              {stop.activities.map((sa, i) => (
                <ActivityRow key={sa.id} sa={sa} index={i} reduce={reduce} />
              ))}
            </div>
          ) : (
            <p className="mt-4 font-mono text-xs text-mute">No activities scheduled yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  if (reduce) return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {body}
    </motion.div>
  );
}

function DaySection({
  dayKey,
  stops,
  index,
  reduce,
}: {
  dayKey: string;
  stops: { stop: TripStop; activities: TripActivity[] }[];
  index: number;
  reduce: boolean;
}) {
  const dayTotal = stops.reduce((sum, s) => sum + activityTotal(s.activities), 0);

  const body = (
    <div className="rounded-sm border border-rail bg-platform p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-4 border-b border-rail/60 pb-3">
        <h2 className="font-display text-xl uppercase tracking-board text-ink sm:text-2xl">
          Day {String(index + 1).padStart(2, "0")}
          <span className="ml-3 font-mono text-xs text-mute">{formatDayLabel(dayKey)}</span>
        </h2>
        <div className="flex-shrink-0 text-right font-mono text-xs text-mute">
          <div className="uppercase tracking-board">Day total</div>
          <div className="text-signal">{money(dayTotal)}</div>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {stops.map(({ stop, activities }) => (
          <div key={stop.id}>
            <p className="font-mono text-xs uppercase tracking-board text-transit">
              {stop.city.name}, {stop.city.country}
            </p>
            {activities.length > 0 ? (
              <div className="mt-2">
                {activities.map((sa, i) => (
                  <ActivityRow key={sa.id} sa={sa} index={i} reduce={reduce} />
                ))}
              </div>
            ) : (
              <p className="mt-2 font-mono text-xs text-mute">No activities this day.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (reduce) return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {body}
    </motion.div>
  );
}

function Hero({
  name,
  startDate,
  endDate,
  heroImage,
  reduce,
}: {
  name: string;
  startDate: string;
  endDate: string;
  heroImage: string | null;
  reduce: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  const bg = heroImage ? (
    reduce ? (
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
    ) : (
      <motion.div
        aria-hidden
        className="absolute inset-[-10%] bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})`, y }}
      />
    )
  ) : null;

  const text = (
    <>
      <p className="font-mono text-xs uppercase tracking-board text-signal">Itinerary</p>
      <h1 className="mt-3 break-words font-display text-5xl uppercase tracking-board text-platform sm:text-7xl">
        {name}
      </h1>
      <p className="mt-4 font-mono text-sm text-rail sm:text-base">
        {formatDate(startDate)} <span className="text-signal">—</span> {formatDate(endDate)}
      </p>
    </>
  );

  return (
    <div ref={ref} className="relative flex h-[60vh] min-h-[380px] items-end overflow-hidden bg-ink">
      {bg}
      <div aria-hidden className="absolute inset-0 bg-ink/70" />
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-12">
        {reduce ? (
          text
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {text}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  const options: { key: ViewMode; label: string }[] = [
    { key: "timeline", label: "Day by day" },
    { key: "city", label: "By city" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Itinerary view mode"
      className="inline-flex rounded-sm border border-rail bg-board p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="tab"
          aria-selected={mode === opt.key}
          onClick={() => onChange(opt.key)}
          className={`rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-board transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit ${
            mode === opt.key
              ? "bg-signal text-ink"
              : "text-platform hover:text-signal"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ItineraryViewPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const reduce = useReducedMotion() ?? false;
  const [mode, setMode] = useState<ViewMode>("timeline");
  const [collabOpen, setCollabOpen] = useState(false);
  // The trip payload includes ownerId; the shared TripDetail type omits it since
  // most itinerary views don't need it, so it's read defensively here.
  const ownerId = (trip as unknown as { ownerId?: string } | undefined)?.ownerId;

  const sortedStops = useMemo(
    () => (trip ? [...trip.stops].sort((a, b) => a.orderIndex - b.orderIndex) : []),
    [trip],
  );

  const days = useMemo(() => {
    const map = new Map<string, { stop: TripStop; activities: TripActivity[] }[]>();
    for (const stop of sortedStops) {
      const keys = stopDayKeys(stop);
      for (const key of keys) {
        const activitiesForDay = stop.activities.filter((a) => {
          if (!a.scheduledDate) return keys[0] === key;
          return a.scheduledDate.slice(0, 10) === key;
        });
        const bucket = map.get(key) ?? [];
        bucket.push({ stop, activities: activitiesForDay });
        map.set(key, bucket);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dayKey, stops]) => ({ dayKey, stops }));
  }, [sortedStops]);

  const heroImage = sortedStops[0]?.city.imageUrl ?? null;
  const total = trip ? tripTotal(sortedStops) : 0;

  if (!tripId) return null;

  return (
    <div className="min-h-screen bg-platform pb-20">
      {isLoading && (
        <div className="bg-ink px-6 py-16" aria-busy="true">
          <div className="mx-auto max-w-4xl">
            <div className="h-4 w-24 animate-pulse rounded-sm bg-board" />
            <div className="mt-4 h-12 w-3/4 animate-pulse rounded-sm bg-board" />
            <div className="mt-4 h-4 w-48 animate-pulse rounded-sm bg-board" />
          </div>
        </div>
      )}

      {isError && (
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-mute">
            Couldn't load this itinerary right now. Please try again shortly.
          </p>
        </div>
      )}

      {trip && !isLoading && !isError && (
        <>
          <Hero
            name={trip.name}
            startDate={trip.startDate}
            endDate={trip.endDate}
            heroImage={heroImage}
            reduce={reduce}
          />

          <div className="mx-auto max-w-4xl px-6">
            <div className="-mt-6 flex flex-wrap items-center justify-between gap-4 rounded-sm bg-ink px-5 py-4 text-platform">
              <ModeToggle mode={mode} onChange={setMode} />
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setCollabOpen(true)}
                  className="font-mono text-xs uppercase tracking-board text-platform transition-colors hover:text-signal"
                >
                  Collaborators
                </button>
                <div className="text-right font-mono text-xs text-mute">
                  <div className="uppercase tracking-board">Trip total</div>
                  <div className="text-lg text-signal">{money(total)}</div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              {sortedStops.length === 0 ? (
                <p className="text-mute">No stops on this itinerary yet.</p>
              ) : reduce ? (
                mode === "timeline" ? (
                  <div className="space-y-6">
                    {days.map((day, i) => (
                      <DaySection
                        key={day.dayKey}
                        dayKey={day.dayKey}
                        stops={day.stops}
                        index={i}
                        reduce={reduce}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="relative space-y-6">
                    {sortedStops.map((stop, i) => (
                      <StopSection key={stop.id} stop={stop} index={i} reduce={reduce} />
                    ))}
                  </div>
                )
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  {mode === "timeline" ? (
                    <motion.div
                      key="timeline"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      {days.map((day, i) => (
                        <DaySection
                          key={day.dayKey}
                          dayKey={day.dayKey}
                          stops={day.stops}
                          index={i}
                          reduce={reduce}
                        />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="city"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="relative space-y-6"
                    >
                      <div
                        aria-hidden
                        className="absolute bottom-6 left-[35px] top-6 hidden w-px bg-rail sm:block"
                      />
                      {sortedStops.map((stop, i) => (
                        <StopSection key={stop.id} stop={stop} index={i} reduce={reduce} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>

          <CollaboratorsPanel
            tripId={tripId}
            ownerId={ownerId}
            open={collabOpen}
            onClose={() => setCollabOpen(false)}
          />
        </>
      )}
    </div>
  );
}
