import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTrip, type TripActivity, type TripStop } from "../itinerary/useTrip";

type ViewMode = "month" | "timeline";

interface DayEntry {
  dayKey: string;
  date: Date;
  stops: TripStop[];
  activities: TripActivity[];
}

function toDayKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDayHeading(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
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
  if (last < cur) return [toDayKey(cur)];
  while (cur <= last) {
    days.push(toDayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function buildDayMap(stops: TripStop[]) {
  const map = new Map<string, { stops: TripStop[]; activities: TripActivity[] }>();
  for (const stop of stops) {
    const keys = stopDayKeys(stop);
    for (const key of keys) {
      const activitiesForDay = stop.activities.filter((a) => {
        if (!a.scheduledDate) return keys[0] === key;
        return a.scheduledDate.slice(0, 10) === key;
      });
      const bucket = map.get(key) ?? { stops: [], activities: [] };
      bucket.stops.push(stop);
      bucket.activities.push(...activitiesForDay);
      map.set(key, bucket);
    }
  }
  return map;
}

/** Builds a full month grid (including lead/trail days from neighboring months) for the given month. */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function monthsBetween(startIso: string, endIso: string): { year: number; month: number }[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const months: { year: number; month: number }[] = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return months;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
  const bg = heroImage ? (
    <div
      aria-hidden
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${heroImage})` }}
    />
  ) : null;

  const text = (
    <>
      <p className="font-mono text-xs uppercase tracking-board text-signal">Calendar</p>
      <h1 className="mt-3 break-words font-display text-5xl uppercase tracking-board text-platform sm:text-7xl">
        {name}
      </h1>
      <p className="mt-4 font-mono text-sm text-rail sm:text-base">
        {formatDate(startDate)} <span className="text-signal">—</span> {formatDate(endDate)}
      </p>
    </>
  );

  return (
    <div className="relative flex h-[46vh] min-h-[300px] items-end overflow-hidden bg-ink">
      {bg}
      <div aria-hidden className="absolute inset-0 bg-ink/70" />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-10">
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

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const options: { key: ViewMode; label: string }[] = [
    { key: "month", label: "Month grid" },
    { key: "timeline", label: "Timeline" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Calendar view mode"
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
            mode === opt.key ? "bg-signal text-ink" : "text-platform hover:text-signal"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DayCell({
  date,
  dayKey,
  inRange,
  entry,
  index,
  reduce,
  onSelect,
  selected,
}: {
  date: Date;
  dayKey: string;
  inRange: boolean;
  entry: { stops: TripStop[]; activities: TripActivity[] } | undefined;
  index: number;
  reduce: boolean;
  onSelect: (dayKey: string) => void;
  selected: boolean;
}) {
  const cityName = entry?.stops[0]?.city.name;
  const cityImage = entry?.stops[0]?.city.imageUrl ?? null;
  const activityCount = entry?.activities.length ?? 0;
  const label = `${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}${
    cityName ? `, in ${cityName}` : ""
  }${activityCount > 0 ? `, ${activityCount} ${activityCount === 1 ? "activity" : "activities"}` : ""}`;

  const content = (
    <button
      type="button"
      onClick={() => inRange && onSelect(dayKey)}
      disabled={!inRange}
      aria-pressed={selected}
      aria-label={label}
      className={`group relative flex h-20 w-full flex-col items-start overflow-hidden rounded-sm border p-2 text-left transition-colors sm:h-24 ${
        inRange
          ? selected
            ? "border-signal bg-ink"
            : "border-rail bg-platform hover:border-transit"
          : "border-transparent bg-transparent opacity-30"
      } ${inRange ? "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit" : "cursor-default"}`}
    >
      {inRange && cityImage && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-20 transition-opacity group-hover:opacity-30"
          style={{ backgroundImage: `url(${cityImage})` }}
        />
      )}
      <span
        className={`relative font-mono text-sm ${selected ? "text-platform" : "text-ink"}`}
      >
        {date.getDate()}
      </span>
      {inRange && cityName && (
        <span
          className={`relative mt-1 truncate font-mono text-[10px] uppercase tracking-board ${
            selected ? "text-rail" : "text-mute"
          }`}
        >
          {cityName}
        </span>
      )}
      {inRange && activityCount > 0 && (
        <span className="relative mt-auto flex items-center gap-1">
          {Array.from({ length: Math.min(activityCount, 4) }).map((_, i) => (
            <span key={i} aria-hidden className="h-1.5 w-1.5 rounded-sm bg-signal" />
          ))}
        </span>
      )}
    </button>
  );

  if (reduce || !inRange) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.01, 0.4), duration: 0.3, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
}

function MonthGrid({
  year,
  month,
  dayMap,
  tripStartKey,
  tripEndKey,
  selectedDay,
  onSelect,
  reduce,
}: {
  year: number;
  month: number;
  dayMap: Map<string, { stops: TripStop[]; activities: TripActivity[] }>;
  tripStartKey: string;
  tripEndKey: string;
  selectedDay: string | null;
  onSelect: (dayKey: string) => void;
  reduce: boolean;
}) {
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  return (
    <div className="rounded-sm border border-rail bg-platform p-4 sm:p-6">
      <h3 className="font-display text-xl uppercase tracking-board text-ink">
        {MONTH_LABELS[month]} <span className="font-mono text-sm text-mute">{year}</span>
      </h3>
      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((wd) => (
          <div
            key={wd}
            className="px-1 pb-1 text-center font-mono text-[10px] uppercase tracking-board text-mute"
          >
            {wd}
          </div>
        ))}
        {grid.map((date, i) => {
          const dayKey = toDayKey(date);
          const inRange = dayKey >= tripStartKey && dayKey <= tripEndKey;
          return (
            <DayCell
              key={dayKey}
              date={date}
              dayKey={dayKey}
              inRange={inRange}
              entry={dayMap.get(dayKey)}
              index={i}
              reduce={reduce}
              onSelect={onSelect}
              selected={selectedDay === dayKey}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayDetailPanel({
  day,
  reduce: _reduce,
}: {
  day: DayEntry;
  reduce: boolean;
}) {
  const total = day.activities.reduce((sum, a) => sum + (a.activity?.estCost ?? 0), 0);
  return (
    <div className="rounded-sm border border-signal bg-board p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h4 className="font-display text-lg uppercase tracking-board text-platform">
          {formatDayHeading(day.dayKey)}
        </h4>
        {total > 0 && (
          <span className="font-mono text-xs text-signal">{money(total)} planned</span>
        )}
      </div>

      {day.stops.length === 0 ? (
        <p className="mt-3 font-mono text-xs text-mute">No stop scheduled this day.</p>
      ) : (
        <p className="mt-1 font-mono text-xs uppercase tracking-board text-transit">
          {day.stops.map((s) => `${s.city.name}, ${s.city.country}`).join(" · ")}
        </p>
      )}

      {day.activities.length > 0 ? (
        <div className="mt-4 divide-y divide-rail/20">
          {day.activities.map((sa) => (
            <div key={sa.id} className="flex items-baseline justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-platform">{sa.activity.name}</p>
                <p className="font-mono text-[11px] uppercase tracking-board text-mute">
                  {sa.activity.category}
                  {sa.scheduledTime ? ` · ${sa.scheduledTime}` : ""}
                </p>
              </div>
              <div className="flex-shrink-0 text-right font-mono text-xs text-mute">
                <div>{sa.activity.estDurationMinutes}min</div>
                <div className="text-platform">{money(sa.activity.estCost)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 font-mono text-xs text-mute">No activities scheduled yet.</p>
      )}
    </div>
  );
}

function DayModal({
  day,
  onClose,
  reduce,
}: {
  day: DayEntry;
  onClose: () => void;
  reduce: boolean;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const total = day.activities.reduce((sum, a) => sum + (a.activity?.estCost ?? 0), 0);
  const cityImage = day.stops[0]?.city.imageUrl ?? null;

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-day-modal-heading"
      className="relative w-full max-w-lg overflow-hidden rounded-sm border border-rail bg-board p-6 sm:p-8"
    >
      {cityImage && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${cityImage})` }}
        />
      )}
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="calendar-day-modal-heading"
              className="font-display text-2xl uppercase tracking-board text-platform"
            >
              {formatDayHeading(day.dayKey)}
            </h2>
            {day.stops.length > 0 && (
              <p className="mt-1 font-mono text-xs uppercase tracking-board text-transit">
                {day.stops.map((s) => `${s.city.name}, ${s.city.country}`).join(" · ")}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close day detail"
            className="flex-shrink-0 rounded-sm border border-rail px-3 py-1.5 font-mono text-xs uppercase tracking-board text-platform transition-colors hover:border-signal hover:text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
          >
            Close
          </button>
        </div>

        {total > 0 && (
          <p className="mt-2 font-mono text-xs text-signal">{money(total)} planned today</p>
        )}

        {day.activities.length > 0 ? (
          <div className="mt-5 max-h-[50vh] divide-y divide-rail/20 overflow-y-auto">
            {day.activities.map((sa) => (
              <div key={sa.id} className="flex items-baseline justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-platform">{sa.activity.name}</p>
                  <p className="font-mono text-[11px] uppercase tracking-board text-mute">
                    {sa.activity.category}
                    {sa.scheduledTime ? ` · ${sa.scheduledTime}` : ""}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right font-mono text-xs text-mute">
                  <div>{sa.activity.estDurationMinutes}min</div>
                  <div className="text-platform">{money(sa.activity.estCost)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 font-mono text-xs text-mute">No activities scheduled this day.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {reduce ? (
        <>
          <div aria-hidden className="absolute inset-0 bg-ink/70" onClick={onClose} />
          {panel}
        </>
      ) : (
        <>
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/70"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {panel}
          </motion.div>
        </>
      )}
    </div>
  );
}

function TimelineDay({
  day,
  index,
  expanded,
  onToggle,
  reduce,
}: {
  day: DayEntry;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  reduce: boolean;
}) {
  const total = day.activities.reduce((sum, a) => sum + (a.activity?.estCost ?? 0), 0);
  const cityName = day.stops[0]?.city.name;

  const body = (
    <div className="relative rounded-sm border border-rail bg-platform">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-rail/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit sm:p-5"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm bg-signal font-mono text-xs font-bold text-ink">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-display text-lg uppercase tracking-board text-ink">
              {formatDayHeading(day.dayKey)}
            </p>
            {cityName && (
              <p className="font-mono text-xs uppercase tracking-board text-transit">
                {cityName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {day.activities.length > 0 && (
            <span className="font-mono text-xs text-mute">
              {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"}
            </span>
          )}
          {total > 0 && <span className="font-mono text-xs text-signal">{money(total)}</span>}
          <span aria-hidden className="font-mono text-xs text-mute">
            {expanded ? "−" : "+"}
          </span>
        </div>
      </button>

      {reduce ? (
        expanded && (
          <div className="border-t border-rail/60 px-4 pb-4 sm:px-5">
            <DayDetailBody day={day} />
          </div>
        )
      ) : (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden border-t border-rail/60"
            >
              <div className="px-4 pb-4 pt-3 sm:px-5">
                <DayDetailBody day={day} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  if (reduce) return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.4, ease: "easeOut" }}
    >
      {body}
    </motion.div>
  );
}

function DayDetailBody({ day }: { day: DayEntry }) {
  if (day.activities.length === 0) {
    return <p className="pt-2 font-mono text-xs text-mute">No activities scheduled this day.</p>;
  }
  return (
    <div className="divide-y divide-rail/40">
      {day.activities.map((sa) => (
        <div key={sa.id} className="flex items-baseline justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{sa.activity.name}</p>
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
      ))}
    </div>
  );
}

export function CalendarPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: trip, isLoading, isError } = useTrip(tripId);
  const reduce = useReducedMotion() ?? false;
  const [mode, setMode] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalDay, setModalDay] = useState<string | null>(null);
  const [expandedTimelineDay, setExpandedTimelineDay] = useState<string | null>(null);

  const sortedStops = useMemo(
    () => (trip ? [...trip.stops].sort((a, b) => a.orderIndex - b.orderIndex) : []),
    [trip],
  );

  const dayMap = useMemo(() => buildDayMap(sortedStops), [sortedStops]);

  const days: DayEntry[] = useMemo(() => {
    if (!trip) return [];
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const result: DayEntry[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const dayKey = toDayKey(cur);
      const entry = dayMap.get(dayKey);
      result.push({
        dayKey,
        date: new Date(cur),
        stops: entry?.stops ?? [],
        activities: entry?.activities ?? [],
      });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [trip, dayMap]);

  const months = useMemo(
    () => (trip ? monthsBetween(trip.startDate, trip.endDate) : []),
    [trip],
  );

  const tripStartKey = trip ? toDayKey(new Date(trip.startDate)) : "";
  const tripEndKey = trip ? toDayKey(new Date(trip.endDate)) : "";

  const heroImage = sortedStops[0]?.city.imageUrl ?? null;
  const selectedDayEntry = days.find((d) => d.dayKey === selectedDay) ?? null;
  const modalDayEntry = days.find((d) => d.dayKey === modalDay) ?? null;

  function handleSelectDay(dayKey: string) {
    setSelectedDay(dayKey);
    setModalDay(dayKey);
  }

  if (!tripId) return null;

  return (
    <div className="min-h-screen bg-platform pb-20">
      {isLoading && (
        <div className="bg-ink px-6 py-16" aria-busy="true">
          <div className="mx-auto max-w-5xl">
            <div className="h-4 w-24 animate-pulse rounded-sm bg-board" />
            <div className="mt-4 h-12 w-3/4 animate-pulse rounded-sm bg-board" />
            <div className="mt-4 h-4 w-48 animate-pulse rounded-sm bg-board" />
          </div>
        </div>
      )}

      {isError && (
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-mute">
            Couldn't load this trip's calendar right now. Please try again shortly.
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

          <div className="mx-auto max-w-5xl px-6">
            <div className="-mt-6 flex flex-wrap items-center justify-between gap-4 rounded-sm bg-ink px-5 py-4 text-platform">
              <ModeToggle mode={mode} onChange={setMode} />
              <div className="flex items-center gap-2 font-mono text-xs text-mute">
                <span className="h-1.5 w-1.5 rounded-sm bg-signal" aria-hidden />
                <span>Activities scheduled</span>
              </div>
            </div>

            <div className="mt-10">
              {days.length === 0 ? (
                <p className="text-mute">No dates on this trip yet.</p>
              ) : (
                <AnimatePresenceOrPlain reduce={reduce} mode={mode}>
                  {mode === "month" ? (
                    <div className="space-y-8">
                      {months.map(({ year, month }) => (
                        <MonthGrid
                          key={`${year}-${month}`}
                          year={year}
                          month={month}
                          dayMap={dayMap}
                          tripStartKey={tripStartKey}
                          tripEndKey={tripEndKey}
                          selectedDay={selectedDay}
                          onSelect={handleSelectDay}
                          reduce={reduce}
                        />
                      ))}
                      {selectedDayEntry && (
                        <div className="mt-2">
                          <DayDetailPanel day={selectedDayEntry} reduce={reduce} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {days.map((day, i) => (
                        <TimelineDay
                          key={day.dayKey}
                          day={day}
                          index={i}
                          expanded={expandedTimelineDay === day.dayKey}
                          onToggle={() =>
                            setExpandedTimelineDay((prev) =>
                              prev === day.dayKey ? null : day.dayKey,
                            )
                          }
                          reduce={reduce}
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresenceOrPlain>
              )}
            </div>
          </div>
        </>
      )}

      {modalDayEntry && !reduce && (
        <AnimatePresence>
          <DayModal
            key={modalDayEntry.dayKey}
            day={modalDayEntry}
            onClose={() => setModalDay(null)}
            reduce={reduce}
          />
        </AnimatePresence>
      )}
      {modalDayEntry && reduce && (
        <DayModal day={modalDayEntry} onClose={() => setModalDay(null)} reduce={reduce} />
      )}
    </div>
  );
}

function AnimatePresenceOrPlain({
  reduce,
  mode,
  children,
}: {
  reduce: boolean;
  mode: ViewMode;
  children: React.ReactNode;
}) {
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
