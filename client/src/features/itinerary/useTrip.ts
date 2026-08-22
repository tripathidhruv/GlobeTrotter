import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface TripActivity {
  id: string;
  scheduledDate: string;
  scheduledTime: string | null;
  activity: {
    id: string;
    name: string;
    category: string;
    estCost: number;
    estDurationMinutes: number;
  };
}

export interface TripStop {
  id: string;
  tripId: string;
  cityId: string;
  orderIndex: number;
  arrivalDate: string;
  departureDate: string;
  city: {
    id: string;
    name: string;
    country: string;
    region: string | null;
    imageUrl: string | null;
  };
  activities: TripActivity[];
}

export interface TripCollaborator {
  id: string;
  userId: string;
  role: string;
}

export interface TripDetail {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  stops: TripStop[];
  collaborators: TripCollaborator[];
}

export function useTrip(tripId?: string) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => apiFetch<TripDetail>(`/trips/${tripId}`),
    enabled: !!tripId,
  });
}

export function useReorderStop(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stopId, orderIndex }: { stopId: string; orderIndex: number }) =>
      apiFetch(`/stops/${stopId}`, {
        method: "PATCH",
        body: JSON.stringify({ orderIndex }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}

export function useDeleteStop(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stopId: string) => apiFetch<void>(`/stops/${stopId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}
