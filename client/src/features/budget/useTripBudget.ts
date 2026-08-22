import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface TripBudget {
  totalCost: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
}

export function useTripBudget(tripId?: string) {
  return useQuery({
    queryKey: ["trip-budget", tripId],
    queryFn: () => apiFetch<TripBudget>(`/trips/${tripId}/budget`),
    enabled: !!tripId,
  });
}
