import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";

export interface TripsOverTimePoint {
  date: string;
  count: number;
}

export interface TopCity {
  cityId: string;
  name: string;
  country: string;
  stopCount: number;
}

export interface TopActivity {
  activityId: string;
  name: string;
  category: string;
  attachCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalTrips: number;
  totalStops: number;
  totalActivitiesAttached: number;
  averageStopsPerTrip: number;
  tripsOverTime: TripsOverTimePoint[];
  topCities: TopCity[];
  topActivities: TopActivity[];
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch<AdminStats>("/admin/stats"),
    retry: false,
  });
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  languagePref: string;
  createdAt: string;
  tripCount: number;
}

export interface AdminUsersPage {
  page: number;
  pageSize: number;
  total: number;
  users: AdminUser[];
}

export function useAdminUsers(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["admin", "users", page, pageSize],
    queryFn: () => apiFetch<AdminUsersPage>(`/admin/users?page=${page}&pageSize=${pageSize}`),
    retry: false,
  });
}
