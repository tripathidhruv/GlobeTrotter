import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface AiSuggestion {
  cityId: string;
  cityName: string;
  country: string;
  reason: string;
  suggestedNights: number;
  activityNames: string[];
  activityIds: string[];
}

export interface AiSuggestResult {
  summary: string;
  suggestions: AiSuggestion[];
}

export interface AiSuggestParams {
  tripId?: string;
  prompt?: string;
  days?: number;
  interests?: string[];
}

export function useAiSuggest() {
  return useMutation({
    mutationFn: (params: AiSuggestParams) =>
      apiFetch<AiSuggestResult>("/ai/suggest", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  });
}
