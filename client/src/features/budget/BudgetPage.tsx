import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useMotionValue, useReducedMotion, animate } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTripBudget } from "./useTripBudget";
import { useTrip } from "../itinerary/useTrip";

const CHART_COLORS = ["#FFB000", "#1B4DFF", "#0E1116", "#6B747C", "#2A3138"];
const OVERBUDGET_THRESHOLD = 1.5; // 150% of the daily average

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Renders a count-up currency value. Under reduced motion, shows the final value immediately. */
function CountUpCurrency({
  value,
  className,
  reduce,
}: {
  value: number;
  className?: string;
  reduce: boolean;
}) {
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(motionVal, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v: number) => setDisplay(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return <span className={className}>{currency.format(Math.round(display))}</span>;
}

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: "Accommodation",
  food: "Food",
  activity: "Activities",
  localTransport: "Local transport",
  interCityTravel: "Inter-city travel",
  other: "Other",
  // Legacy/raw expense category spellings, kept for compatibility.
  transport: "Transport",
  stay: "Stay",
  activities: "Activities",
  meals: "Meals",
  meal: "Food",
};

function categoryLabel(key: string) {
  return CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export function BudgetPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const { data: budget, isLoading: budgetLoading, isError: budgetError } = useTripBudget(tripId);
  const { data: trip, isLoading: tripLoading, isError: tripError } = useTrip(tripId);
  const reduceMotionPref = useReducedMotion();
  const reduce = reduceMotionPref ?? false;

  const isLoading = budgetLoading || tripLoading;
  const isError = budgetError || tripError;

  const heroCity = trip?.stops?.find((s) => s.city.imageUrl)?.city;

  const categoryData = useMemo(() => {
    if (!budget) return [];
    const estimatedKeys = new Set(budget.estimatedCategories ?? []);
    return Object.entries(budget.byCategory)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: categoryLabel(key), value, estimated: estimatedKeys.has(key) }));
  }, [budget]);

  const dayData = useMemo(() => {
    if (!budget) return [];
    return Object.entries(budget.byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [budget]);

  const averagePerDay = useMemo(() => {
    if (dayData.length === 0) return 0;
    const sum = dayData.reduce((acc, d) => acc + d.value, 0);
    return sum / dayData.length;
  }, [dayData]);

  const overBudgetDays = useMemo(() => {
    if (averagePerDay <= 0) return new Set<string>();
    const threshold = averagePerDay * OVERBUDGET_THRESHOLD;
    return new Set(dayData.filter((d) => d.value > threshold).map((d) => d.date));
  }, [dayData, averagePerDay]);

  if (!tripId) return null;

  const HeroWrapper = reduce ? "div" : motion.div;
  const heroMotionProps = reduce
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.8 },
      };

  return (
    <div className="min-h-screen bg-platform pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden bg-ink">
        {heroCity?.imageUrl && (
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroCity.imageUrl})` }}
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-ink/70" />
        <HeroWrapper {...(heroMotionProps as object)} className="relative px-6 py-16 text-platform">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-board text-signal">
              Budget & cost breakdown
            </p>

            {isLoading && (
              <div className="mt-3 h-10 w-72 animate-pulse rounded-sm bg-board" />
            )}

            {trip && (
              <>
                <h1 className="mt-2 font-display text-3xl uppercase tracking-board sm:text-4xl">
                  {trip.name}
                </h1>
                <p className="mt-2 font-mono text-sm text-rail">
                  {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
                </p>
              </>
            )}

            {budget && (
              <div className="mt-8">
                <p className="font-mono text-xs uppercase tracking-board text-rail">Total cost</p>
                <CountUpCurrency
                  value={budget.totalCost}
                  reduce={reduce}
                  className="mt-1 block font-mono text-4xl font-bold text-platform sm:text-5xl"
                />
              </div>
            )}
          </div>
        </HeroWrapper>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {isLoading && (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-sm bg-board/20" />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <p className="text-mute">
            Couldn't load the budget for this trip right now. Please try again shortly.
          </p>
        )}

        {budget && !isLoading && !isError && (
          <>
            {/* Average per day + alert threshold note */}
            <RevealSection reduce={reduce}>
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rail pb-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-board text-mute">
                    Average cost / day
                  </p>
                  <p className="font-mono text-2xl text-ink">{currency.format(Math.round(averagePerDay))}</p>
                </div>
                <p className="font-mono text-xs text-mute">
                  Days flagged when spend exceeds{" "}
                  <span className="text-signal">{Math.round(OVERBUDGET_THRESHOLD * 100)}%</span> of the
                  daily average
                </p>
              </div>
            </RevealSection>

            {/* Charts */}
            <div className="mt-10 grid gap-10 sm:grid-cols-2">
              <RevealSection reduce={reduce}>
                <h2 className="mb-4 font-display text-lg uppercase tracking-board text-ink">
                  By category
                </h2>
                {categoryData.length === 0 ? (
                  <p className="text-mute">No category data yet.</p>
                ) : (
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={95}
                          isAnimationActive={!reduce}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => currency.format(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {categoryData.length > 0 && (
                  <ul className="mt-4 space-y-1">
                    {categoryData.map((entry, index) => (
                      <li
                        key={entry.name}
                        className="flex items-center justify-between gap-3 font-mono text-sm text-board"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          {entry.name}
                          {entry.estimated && (
                            <span className="font-mono text-[10px] uppercase tracking-board text-mute">
                              est.
                            </span>
                          )}
                        </span>
                        <span>{currency.format(entry.value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </RevealSection>

              <RevealSection reduce={reduce}>
                <h2 className="mb-4 font-display text-lg uppercase tracking-board text-ink">
                  By day
                </h2>
                {dayData.length === 0 ? (
                  <p className="text-mute">No daily data yet.</p>
                ) : (
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dayData}>
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDayLabel}
                          tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: "#6B747C" }}
                          axisLine={{ stroke: "#D3D8DD" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: "#6B747C" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip formatter={(value: number) => currency.format(value)} labelFormatter={formatDayLabel} />
                        <Bar dataKey="value" isAnimationActive={!reduce} radius={[2, 2, 0, 0]}>
                          {dayData.map((entry) => (
                            <Cell
                              key={entry.date}
                              fill={overBudgetDays.has(entry.date) ? "#FFB000" : "#1B4DFF"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </RevealSection>
            </div>

            {/* Timetable-style per-day breakdown */}
            <RevealSection reduce={reduce}>
              <h2 className="mt-12 mb-2 font-display text-lg uppercase tracking-board text-ink">
                Daily breakdown
              </h2>
              {dayData.length === 0 ? (
                <p className="text-mute">No days recorded yet.</p>
              ) : (
                <div>
                  {dayData.map((d) => {
                    const isOver = overBudgetDays.has(d.date);
                    return (
                      <div
                        key={d.date}
                        className={`flex items-center justify-between gap-4 border-t border-rail py-3 transition-colors hover:bg-rail/30 ${
                          isOver ? "text-signal" : "text-ink"
                        }`}
                      >
                        <span className="font-mono text-sm text-mute">{formatDayLabel(d.date)}</span>
                        <div className="flex items-center gap-3">
                          {isOver && (
                            <span className="font-mono text-xs uppercase tracking-board text-signal">
                              Over budget
                            </span>
                          )}
                          <span className="font-mono text-sm font-bold">
                            {currency.format(d.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </RevealSection>

            {/* Per-stop breakdown */}
            {budget.perStop && budget.perStop.length > 0 && (
              <RevealSection reduce={reduce}>
                <h2 className="mt-12 mb-2 font-display text-lg uppercase tracking-board text-ink">
                  By stop
                </h2>
                <div>
                  {budget.perStop.map((stop) => {
                    const stopTotal = stop.accommodation + stop.food + stop.localTransport + stop.activities;
                    return (
                      <div key={stop.stopId} className="border-t border-rail py-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-mono text-sm text-ink">
                            {stop.cityName}{" "}
                            <span className="text-mute">
                              · {stop.nights} night{stop.nights === 1 ? "" : "s"} · cost index{" "}
                              {stop.costIndex}
                            </span>
                          </span>
                          <span className="font-mono text-sm font-bold text-ink">
                            {currency.format(stopTotal)}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-mute">
                          Accommodation {currency.format(stop.accommodation)} (est.) · Food{" "}
                          {currency.format(stop.food)} (est.) · Local transport{" "}
                          {currency.format(stop.localTransport)} (est.) · Activities{" "}
                          {currency.format(stop.activities)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </RevealSection>
            )}

            {/* Transparency note: how the estimate is calculated */}
            {budget.assumptions && (
              <RevealSection reduce={reduce}>
                <div className="mt-12 border border-rail bg-platform p-4">
                  <h2 className="font-display text-sm uppercase tracking-board text-ink">
                    How this is calculated
                  </h2>
                  <p className="mt-2 font-mono text-xs text-mute">
                    Accommodation, food, local transport, and inter-city travel are{" "}
                    <span className="text-signal">ESTIMATES</span>, not confirmed bookings.
                    Activity costs are exact, taken from activities you've added to this trip.
                    Any expense you log yourself replaces the matching estimate.
                  </p>
                  <ul className="mt-3 space-y-1 font-mono text-xs text-mute">
                    <li>
                      Baseline rates assume a cost index of{" "}
                      <span className="text-ink">{budget.assumptions.referenceCostIndex}</span> and
                      scale up or down with each city's own cost index.
                    </li>
                    <li>
                      Accommodation:{" "}
                      <span className="text-ink">
                        {currency.format(budget.assumptions.accommodationPerNight)}
                      </span>{" "}
                      / night
                    </li>
                    <li>
                      Food:{" "}
                      <span className="text-ink">{currency.format(budget.assumptions.foodPerDay)}</span> /
                      day
                    </li>
                    <li>
                      Local transport:{" "}
                      <span className="text-ink">
                        {currency.format(budget.assumptions.localTransportPerDay)}
                      </span>{" "}
                      / day
                    </li>
                    <li>
                      Inter-city travel:{" "}
                      <span className="text-ink">
                        {currency.format(budget.assumptions.interCityHop)}
                      </span>{" "}
                      / hop between stops
                    </li>
                  </ul>
                </div>
              </RevealSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RevealSection({
  children,
  reduce,
}: {
  children: React.ReactNode;
  reduce: boolean;
}) {
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
