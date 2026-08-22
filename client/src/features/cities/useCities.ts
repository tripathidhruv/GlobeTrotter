import { useQuery } from "@tanstack/react-query";
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

export function useCities() {
  return useQuery({ queryKey: ["cities"], queryFn: () => apiFetch<City[]>("/cities") });
}
