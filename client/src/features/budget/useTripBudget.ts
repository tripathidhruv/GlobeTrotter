import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface TripBudgetStop {
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

export interface TripBudgetAssumptions {
  referenceCostIndex: number;
  accommodationPerNight: number;
  foodPerDay: number;
  localTransportPerDay: number;
  interCityHop: number;
  note: string;
}

export interface TripBudget {
  totalCost: number;
  byCategory: Record<string, number>;
  byDay: Record<string, number>;
  // Additive fields — the estimation model behind the totals above.
  perStop?: TripBudgetStop[];
  totalNights?: number;
  averagePerDay?: number;
  estimatedCategories?: string[];
  assumptions?: TripBudgetAssumptions;
}

export function useTripBudget(tripId?: string) {
  return useQuery({
    queryKey: ["trip-budget", tripId],
    queryFn: () => apiFetch<TripBudget>(`/trips/${tripId}/budget`),
    enabled: !!tripId,
  });
}
