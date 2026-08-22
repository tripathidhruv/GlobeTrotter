import db from "../db.js";

// ---------------------------------------------------------------------------
// Estimation baselines
//
// These are documented "typical daily spend" figures for a mid-cost
// destination (City.costIndex === REFERENCE_COST_INDEX, i.e. 50 on the 0-100
// scale). Every city's actual rate is derived by scaling these baselines by
// `city.costIndex / REFERENCE_COST_INDEX`, so a pricier destination (e.g.
// New York City at ~92) costs roughly 1.8x these figures, while a cheaper one
// (e.g. Lisbon at ~50) costs roughly what's listed here.
//
// These numbers are rough, tunable estimates for budgeting purposes only —
// NOT real bookings or quotes. Tune them here as better data becomes
// available.
// ---------------------------------------------------------------------------
export const REFERENCE_COST_INDEX = 50;

/** Estimated cost of one night of accommodation in a mid-cost city (USD). */
export const BASELINE_ACCOMMODATION_PER_NIGHT = 90;

/** Estimated cost of a day's food (breakfast/lunch/dinner) in a mid-cost city (USD). */
export const BASELINE_FOOD_PER_DAY = 45;

/** Estimated cost of a day's local transport (metro/bus/taxi) in a mid-cost city (USD). */
export const BASELINE_LOCAL_TRANSPORT_PER_DAY = 15;

/**
 * Estimated cost of one inter-city hop (flight/train/bus between consecutive
 * stops) at mid-cost, scaled by the AVERAGE cost index of the two cities
 * involved in the hop (USD).
 */
export const BASELINE_INTERCITY_HOP = 120;

export interface BudgetAssumptions {
  referenceCostIndex: number;
  accommodationPerNight: number;
  foodPerDay: number;
  localTransportPerDay: number;
  interCityHop: number;
  note: string;
}

export interface StopBudget {
  stopId: string;
  cityId: string;
  cityName: string;
  costIndex: number;
  nights: number;
  accommodation: number;
  food: number;
  localTransport: number;
  activities: number;
}

export interface BudgetBreakdown {
  totalCost: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
  // --- additive fields below: existing consumers only rely on the three keys above ---
  perStop: StopBudget[];
  totalNights: number;
  averagePerDay: number;
  /** Which byCategory keys are currently ESTIMATED (no actual logged expense overrode them). */
  estimatedCategories: string[];
  assumptions: BudgetAssumptions;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Whole calendar nights between arrival and departure, minimum 1 for a same-day stop. */
function nightsBetween(arrival: Date, departure: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((departure.getTime() - arrival.getTime()) / msPerDay);
  return Math.max(1, diff);
}

function addToDay(byDay: Record<string, number>, date: Date, amount: number) {
  const key = dayKey(date);
  byDay[key] = (byDay[key] ?? 0) + amount;
}

export async function computeTripBudget(tripId: string): Promise<BudgetBreakdown> {
  const stops = await db.stop.findMany({
    where: { tripId },
    include: {
      city: true,
      activities: { include: { activity: true } },
    },
    orderBy: { orderIndex: "asc" },
  });
  const expenses = await db.expense.findMany({ where: { tripId } });

  const byCategory: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  const perStop: StopBudget[] = [];
  const estimatedCategories = new Set<string>();

  // --- Activities: genuine logged data. Never estimated — summed exactly. ---
  let activityTotal = 0;
  for (const stop of stops) {
    let stopActivityTotal = 0;
    for (const sa of stop.activities) {
      const cost = sa.costOverride ?? sa.activity.estCost;
      stopActivityTotal += cost;
      addToDay(byDay, sa.scheduledDate, cost);
    }
    activityTotal += stopActivityTotal;
    perStop.push({
      stopId: stop.id,
      cityId: stop.cityId,
      cityName: stop.city.name,
      costIndex: stop.city.costIndex,
      nights: nightsBetween(stop.arrivalDate, stop.departureDate),
      accommodation: 0,
      food: 0,
      localTransport: 0,
      activities: stopActivityTotal,
    });
  }

  // --- Precedence rule ---------------------------------------------------
  // A category is ESTIMATED by default (accommodation, food, local transport,
  // inter-city travel). If the user has logged real Expense rows in the
  // matching ExpenseCategory, those actuals REPLACE the estimate for that
  // category entirely (actual data beats a guess). Expense rows in the
  // "activity" category are treated as additional real spend on top of the
  // (already-exact) activity total, since they represent genuine cash spent,
  // not an estimate to be overridden. "other" expenses are always additive.
  // Inter-city travel has no direct Expense category match, so it always
  // stays an estimate — a savvy user can log it under "transport" (which
  // then overrides local transport) or "other".
  const actualByCategory: Record<string, number> = {};
  const actualExpensesByCategory: Record<string, typeof expenses> = {};
  for (const exp of expenses) {
    actualByCategory[exp.category] = (actualByCategory[exp.category] ?? 0) + exp.amount;
    (actualExpensesByCategory[exp.category] ??= []).push(exp);
  }

  // --- Accommodation ---
  let accommodationTotal = 0;
  for (const [i, stop] of stops.entries()) {
    const stopBudget = perStop[i]!;
    const ratio = stop.city.costIndex / REFERENCE_COST_INDEX;
    const accommodation = stopBudget.nights * BASELINE_ACCOMMODATION_PER_NIGHT * ratio;
    stopBudget.accommodation = accommodation;
    accommodationTotal += accommodation;
  }
  if ((actualByCategory.stay ?? 0) > 0) {
    byCategory.accommodation = actualByCategory.stay ?? 0;
    for (const exp of actualExpensesByCategory.stay ?? []) addToDay(byDay, exp.expenseDate, exp.amount);
  } else {
    byCategory.accommodation = accommodationTotal;
    estimatedCategories.add("accommodation");
    for (const [i, stop] of stops.entries()) {
      const stopBudget = perStop[i]!;
      const perNight = stopBudget.accommodation / stopBudget.nights;
      for (let n = 0; n < stopBudget.nights; n++) addToDay(byDay, addDays(stop.arrivalDate, n), perNight);
    }
  }

  // --- Food ---
  let foodTotal = 0;
  for (const [i, stop] of stops.entries()) {
    const stopBudget = perStop[i]!;
    const ratio = stop.city.costIndex / REFERENCE_COST_INDEX;
    const food = stopBudget.nights * BASELINE_FOOD_PER_DAY * ratio;
    stopBudget.food = food;
    foodTotal += food;
  }
  if ((actualByCategory.meal ?? 0) > 0) {
    byCategory.food = actualByCategory.meal ?? 0;
    for (const exp of actualExpensesByCategory.meal ?? []) addToDay(byDay, exp.expenseDate, exp.amount);
  } else {
    byCategory.food = foodTotal;
    estimatedCategories.add("food");
    for (const [i, stop] of stops.entries()) {
      const stopBudget = perStop[i]!;
      const perDay = stopBudget.food / stopBudget.nights;
      for (let n = 0; n < stopBudget.nights; n++) addToDay(byDay, addDays(stop.arrivalDate, n), perDay);
    }
  }

  // --- Local transport ---
  let localTransportTotal = 0;
  for (const [i, stop] of stops.entries()) {
    const stopBudget = perStop[i]!;
    const ratio = stop.city.costIndex / REFERENCE_COST_INDEX;
    const localTransport = stopBudget.nights * BASELINE_LOCAL_TRANSPORT_PER_DAY * ratio;
    stopBudget.localTransport = localTransport;
    localTransportTotal += localTransport;
  }
  if ((actualByCategory.transport ?? 0) > 0) {
    byCategory.localTransport = actualByCategory.transport ?? 0;
    for (const exp of actualExpensesByCategory.transport ?? []) addToDay(byDay, exp.expenseDate, exp.amount);
  } else {
    byCategory.localTransport = localTransportTotal;
    estimatedCategories.add("localTransport");
    for (const [i, stop] of stops.entries()) {
      const stopBudget = perStop[i]!;
      const perDay = stopBudget.localTransport / stopBudget.nights;
      for (let n = 0; n < stopBudget.nights; n++) addToDay(byDay, addDays(stop.arrivalDate, n), perDay);
    }
  }

  // --- Inter-city travel: one estimated hop between each consecutive pair of stops ---
  let interCityTotal = 0;
  estimatedCategories.add("interCityTravel");
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1]!;
    const curr = stops[i]!;
    const avgRatio = (prev.city.costIndex + curr.city.costIndex) / 2 / REFERENCE_COST_INDEX;
    const hopCost = BASELINE_INTERCITY_HOP * avgRatio;
    interCityTotal += hopCost;
    // Attribute the hop's cost to the day of departure from the previous stop.
    addToDay(byDay, prev.departureDate, hopCost);
  }
  byCategory.interCityTravel = interCityTotal;

  // --- Activities: exact real data, plus any "activity"-category expenses (also real). ---
  const activityExpenseExtra = actualByCategory.activity ?? 0;
  for (const exp of actualExpensesByCategory.activity ?? []) addToDay(byDay, exp.expenseDate, exp.amount);
  byCategory.activity = activityTotal + activityExpenseExtra;

  // --- Other: always additive, real logged spend that doesn't fit elsewhere. ---
  if ((actualByCategory.other ?? 0) > 0) {
    byCategory.other = actualByCategory.other ?? 0;
    for (const exp of actualExpensesByCategory.other ?? []) addToDay(byDay, exp.expenseDate, exp.amount);
  }

  const totalCost = Object.values(byCategory).reduce((sum, v) => sum + v, 0);
  const totalNights = perStop.reduce((sum, s) => sum + s.nights, 0);
  const dayCount = Object.keys(byDay).length;
  const averagePerDay = dayCount > 0 ? totalCost / dayCount : 0;

  return {
    totalCost,
    byCategory,
    byDay,
    perStop,
    totalNights,
    averagePerDay,
    estimatedCategories: Array.from(estimatedCategories),
    assumptions: {
      referenceCostIndex: REFERENCE_COST_INDEX,
      accommodationPerNight: BASELINE_ACCOMMODATION_PER_NIGHT,
      foodPerDay: BASELINE_FOOD_PER_DAY,
      localTransportPerDay: BASELINE_LOCAL_TRANSPORT_PER_DAY,
      interCityHop: BASELINE_INTERCITY_HOP,
      note:
        "Accommodation, food, local transport, and inter-city travel are ESTIMATES scaled by each city's cost index (baseline rates are for a cost index of 50). Activity costs are exact, from logged activities. Any logged expense in a matching category replaces its estimate.",
    },
  };
}
