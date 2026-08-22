import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { AdminPage } from "../src/features/admin/AdminPage";
import { useAdminStats, useAdminUsers } from "../src/features/admin/useAdminStats";

vi.mock("../src/features/admin/useAdminStats", () => ({
  useAdminStats: vi.fn(),
  useAdminUsers: vi.fn(),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 260 }}>{children}</div>
    ),
  };
});

const stats = {
  totalUsers: 12,
  totalTrips: 6,
  totalStops: 18,
  totalActivitiesAttached: 40,
  averageStopsPerTrip: 3,
  tripsOverTime: [
    { date: "2026-08-01", count: 2 },
    { date: "2026-08-02", count: 4 },
  ],
  topCities: [
    { cityId: "c1", name: "Tokyo", country: "Japan", stopCount: 5 },
    { cityId: "c2", name: "Lisbon", country: "Portugal", stopCount: 3 },
  ],
  topActivities: [
    { activityId: "a1", name: "Shibuya Crossing", category: "sightseeing", attachCount: 9 },
  ],
};

const usersPage = {
  page: 1,
  pageSize: 20,
  total: 2,
  users: [
    {
      id: "u1",
      email: "sanchitavinchu@gmail.com",
      name: "Sanchita",
      role: "admin",
      languagePref: "en",
      createdAt: "2026-01-01T00:00:00.000Z",
      tripCount: 3,
    },
    {
      id: "u2",
      email: "someone@example.com",
      name: null,
      role: "user",
      languagePref: "en",
      createdAt: "2026-02-01T00:00:00.000Z",
      tripCount: 1,
    },
  ],
};

function renderPage() {
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>
  );
}

describe("AdminPage", () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it("renders stat tiles, top cities/activities, and the user table", () => {
    vi.mocked(useAdminStats).mockReturnValue({
      data: stats,
      isLoading: false,
      isError: false,
      error: null,
    } as any);
    vi.mocked(useAdminUsers).mockReturnValue({
      data: usersPage,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderPage();

    expect(screen.getByText("Admin board")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Shibuya Crossing")).toBeInTheDocument();
    expect(screen.getByText("sanchitavinchu@gmail.com")).toBeInTheDocument();
    expect(screen.getAllByText("someone@example.com").length).toBeGreaterThan(0);
  });

  it("shows a loading state while fetching", () => {
    vi.mocked(useAdminStats).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);
    vi.mocked(useAdminUsers).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    renderPage();

    expect(screen.getByText("Admin board")).toBeInTheDocument();
  });

  it("renders a clean not-authorised state on a 403, never a crash", () => {
    const forbidden = new Error('"admin access required"');
    vi.mocked(useAdminStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: forbidden,
    } as any);
    vi.mocked(useAdminUsers).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: forbidden,
    } as any);

    renderPage();

    expect(screen.getByText("Not authorised")).toBeInTheDocument();
    expect(screen.queryByText("Admin board")).not.toBeInTheDocument();
  });

  it("shows an error state on unexpected stats failure", () => {
    vi.mocked(useAdminStats).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Request failed: 500"),
    } as any);
    vi.mocked(useAdminUsers).mockReturnValue({
      data: usersPage,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    renderPage();

    expect(screen.getByText(/Couldn't load admin stats/)).toBeInTheDocument();
  });
});
