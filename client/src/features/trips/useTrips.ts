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
}

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: () => apiFetch<Trip[]>("/trips") });
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
