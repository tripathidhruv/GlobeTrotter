import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface Profile {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  role: "user" | "admin";
  languagePref: string;
  createdAt: string;
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => apiFetch<Profile>("/users/me") });
}

export interface UpdateProfileInput {
  name?: string | null;
  avatarUrl?: string | null;
  languagePref?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<Profile>("/users/me", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: (profile) => queryClient.setQueryData(["profile"], profile),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => apiFetch<void>("/users/me", { method: "DELETE" }),
  });
}
