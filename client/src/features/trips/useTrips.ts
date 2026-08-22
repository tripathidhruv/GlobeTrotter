import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface Trip {
  id: string;
  name: string;
  description?: string | null;
  coverPhotoUrl?: string | null;
  startDate: string;
  endDate: string;
  ownerId: string;
  _count?: { stops: number };
  /** First stop only, used for the card image on list views. */
  stops?: { city: { name: string; country: string; imageUrl?: string | null } }[];
}

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: () => apiFetch<Trip[]>("/trips") });
}

export interface TripStop {
  id: string;
  tripId: string;
  cityId: string;
  orderIndex: number;
  arrivalDate: string;
  departureDate: string;
}

export interface TripDetail extends Trip {
  stops: TripStop[];
}

export function useTrip(tripId?: string) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => apiFetch<TripDetail>(`/trips/${tripId}`),
    enabled: !!tripId,
  });
}

export interface CreateTripInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  coverPhotoUrl?: string;
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) => apiFetch<Trip>("/trips", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/trips/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips"] }),
  });
}
