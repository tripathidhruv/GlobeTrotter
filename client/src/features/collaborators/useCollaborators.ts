import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";
import { supabase } from "../../lib/supabase";

export interface Collaborator {
  id: string;
  tripId: string;
  userId: string;
  role: string;
  user: { email: string; name: string | null };
}

export function useCollaborators(tripId?: string) {
  return useQuery({
    queryKey: ["collaborators", tripId],
    queryFn: () => apiFetch<Collaborator[]>(`/trips/${tripId}/collaborators`),
    enabled: !!tripId,
  });
}

export interface InviteInput {
  email: string;
  role: "editor" | "viewer";
}

export function useInviteCollaborator(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteInput) =>
      apiFetch<Collaborator>(`/trips/${tripId}/collaborators`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators", tripId] }),
  });
}

export function useRemoveCollaborator(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<void>(`/trips/${tripId}/collaborators/${userId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collaborators", tripId] }),
  });
}

/** Current authenticated user's id, for owner-only UI gating. */
export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
