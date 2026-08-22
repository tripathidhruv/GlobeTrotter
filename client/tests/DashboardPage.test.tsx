import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { DashboardPage } from "../src/features/dashboard/DashboardPage";
import { useTrips } from "../src/features/trips/useTrips";
import { useCities } from "../src/features/cities/useCities";
import { useTripBudget } from "../src/features/budget/useTripBudget";

vi.mock("../src/features/trips/useTrips", () => ({ useTrips: vi.fn() }));
vi.mock("../src/features/cities/useCities", () => ({ useCities: vi.fn() }));
vi.mock("../src/features/budget/useTripBudget", () => ({ useTripBudget: vi.fn() }));

function renderDashboard() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        { id: "1", name: "Japan Trip", startDate: "2026-09-01", endDate: "2026-09-10", ownerId: "u1" },
      ],
      isLoading: false,
    } as any);
    vi.mocked(useCities).mockReturnValue({
      data: [
        { id: "c1", name: "Lisbon", country: "Portugal", costIndex: 40, popularityScore: 10 },
      ],
      isLoading: false,
    } as any);
    vi.mocked(useTripBudget).mockReturnValue({
      data: { totalCost: 1234, byCategory: {}, byDay: {} },
      isLoading: false,
    } as any);
  });

  it("renders trip cards from useTrips", () => {
    renderDashboard();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
  });

  it("renders recommended cities from useCities", () => {
    renderDashboard();
    expect(screen.getByText("Lisbon")).toBeInTheDocument();
  });

  it("renders the budget highlight total cost in font-mono", () => {
    renderDashboard();
    const el = screen.getByText("$1,234");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("font-mono");
  });

  it("renders an honest empty state when there are no trips, cities, or budget", () => {
    vi.mocked(useTrips).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(useCities).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(useTripBudget).mockReturnValue({ data: undefined, isLoading: false } as any);
    renderDashboard();
    expect(screen.queryByText("Japan Trip")).not.toBeInTheDocument();
    expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
    expect(screen.getByText(/plan a trip to see your budget/i)).toBeInTheDocument();
  });
});
