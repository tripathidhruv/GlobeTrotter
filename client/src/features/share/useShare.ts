import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";
import type { TripActivity, TripStop } from "../itinerary/useTrip";

export interface PublicTrip {
  id: string;
  name: string;
  description: string | null;
  coverPhotoUrl: string | null;
  startDate: string;
  endDate: string;
  stops: TripStop[];
}

export type { TripActivity, TripStop };

export function usePublicTrip(slug?: string) {
  return useQuery({
    queryKey: ["public-trip", slug],
    queryFn: () => apiFetch<PublicTrip>(`/trips/public/${slug}`),
    enabled: !!slug,
    retry: false,
  });
}

export function useEnableShare(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ shareSlug: string }>(`/trips/${tripId}/share`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}

export function useDisableShare(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>(`/trips/${tripId}/share`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
  });
}
