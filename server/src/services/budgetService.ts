import db from "../db.js";

export interface BudgetBreakdown {
  totalCost: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function computeTripBudget(tripId: string): Promise<BudgetBreakdown> {
  const stopActivities = await db.stopActivity.findMany({
    where: { stop: { tripId } },
    include: { activity: true },
  });
  const expenses = await db.expense.findMany({ where: { tripId } });

  const byCategory: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let totalCost = 0;

  for (const sa of stopActivities) {
    const cost = sa.costOverride ?? sa.activity.estCost;
    totalCost += cost;
    byCategory.activity = (byCategory.activity ?? 0) + cost;
    const key = dayKey(sa.scheduledDate);
    byDay[key] = (byDay[key] ?? 0) + cost;
  }

  for (const exp of expenses) {
    totalCost += exp.amount;
    byCategory[exp.category] = (byCategory[exp.category] ?? 0) + exp.amount;
    const key = dayKey(exp.expenseDate);
    byDay[key] = (byDay[key] ?? 0) + exp.amount;
  }

  return { totalCost, byCategory, byDay };
}
