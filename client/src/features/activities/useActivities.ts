import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface Activity {
  id: string;
  cityId: string;
  name: string;
  category: string;
  description?: string | null;
  imageUrl?: string | null;
  estCost: number;
  estDurationMinutes: number;
}

export function useActivities(cityId?: string, category?: string, costMax?: number) {
  const params = new URLSearchParams();
  if (cityId) params.set("city_id", cityId);
  if (category) params.set("type", category);
  if (costMax !== undefined) params.set("cost_max", String(costMax));
  const qs = params.toString();
  return useQuery({
    queryKey: ["activities", cityId ?? "", category ?? "", costMax ?? ""],
    queryFn: () => apiFetch<Activity[]>(qs ? `/activities?${qs}` : "/activities"),
    enabled: !!cityId,
  });
}

export interface AttachActivityInput {
  stopId: string;
  activityId: string;
  scheduledDate: string;
  scheduledTime?: string;
}

export function useAttachActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stopId, ...body }: AttachActivityInput) =>
      apiFetch(`/stops/${stopId}/activities`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });
}

export function useDetachActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stopActivityId: string) =>
      apiFetch<void>(`/stop-activities/${stopActivityId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });
}
