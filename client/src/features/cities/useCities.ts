import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface City {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  costIndex: number;
  popularityScore: number;
  imageUrl?: string | null;
}

export function useCities(search?: string, region?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (region) params.set("region", region);
  const qs = params.toString();
  return useQuery({
    queryKey: ["cities", search ?? "", region ?? ""],
    queryFn: () => apiFetch<City[]>(qs ? `/cities?${qs}` : "/cities"),
  });
}

export interface CreateStopInput {
  cityId: string;
  orderIndex: number;
  arrivalDate: string;
  departureDate: string;
}

export function useCreateStop(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStopInput) =>
      apiFetch(`/trips/${tripId}/stops`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });
}
