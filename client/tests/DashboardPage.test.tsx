import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { DashboardPage } from "../src/features/dashboard/DashboardPage";
import { useTrips } from "../src/features/trips/useTrips";
import { useCities } from "../src/features/cities/useCities";
import { useTripBudget } from "../src/features/budget/useTripBudget";

vi.mock("../src/features/trips/useTrips", () => ({ useTrips: vi.fn() }));
vi.mock("../src/features/cities/useCities", () => ({ useCities: vi.fn() }));
vi.mock("../src/features/budget/useTripBudget", () => ({ useTripBudget: vi.fn() }));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

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
      isError: false,
    } as any);
    vi.mocked(useCities).mockReturnValue({
      data: [
        { id: "c1", name: "Lisbon", country: "Portugal", costIndex: 40, popularityScore: 10 },
      ],
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useTripBudget).mockReturnValue({
      data: { totalCost: 1234, byCategory: {}, byDay: {} },
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it("renders trip cards from useTrips", () => {
    renderDashboard();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
  });

  it("renders recommended cities from useCities", () => {
    renderDashboard();
    // The city name also appears in the ticker and scenery band, so match all.
    expect(screen.getAllByText("Lisbon").length).toBeGreaterThan(0);
  });

  it("renders the budget highlight total cost in font-mono", () => {
    renderDashboard();
    const el = screen.getByText("$1,234");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("font-mono");
  });

  it("renders an honest empty state when there are no trips, cities, or budget", () => {
    vi.mocked(useTrips).mockReturnValue({ data: [], isLoading: false, isError: false } as any);
    vi.mocked(useCities).mockReturnValue({ data: [], isLoading: false, isError: false } as any);
    vi.mocked(useTripBudget).mockReturnValue({ data: undefined, isLoading: false, isError: false } as any);
    renderDashboard();
    expect(screen.queryByText("Japan Trip")).not.toBeInTheDocument();
    expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
    expect(screen.getByText(/plan a trip to see your budget/i)).toBeInTheDocument();
  });

  it("renders an honest error state when trips fail to load", () => {
    vi.mocked(useTrips).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    renderDashboard();
    expect(screen.queryByText("Japan Trip")).not.toBeInTheDocument();
    expect(screen.queryByText(/no trips yet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/couldn't load your trips/i)).toBeInTheDocument();
  });

  it("renders an honest error state when cities fail to load", () => {
    vi.mocked(useCities).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    renderDashboard();
    expect(screen.queryByText("Lisbon")).not.toBeInTheDocument();
    expect(screen.queryByText(/no cities available/i)).not.toBeInTheDocument();
    expect(screen.getByText(/couldn't load recommended cities/i)).toBeInTheDocument();
  });

  it("renders an honest error state when the budget fails to load", () => {
    vi.mocked(useTripBudget).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    renderDashboard();
    expect(screen.queryByText("$1,234")).not.toBeInTheDocument();
    expect(screen.queryByText(/budget details aren't available/i)).not.toBeInTheDocument();
    expect(screen.getByText(/couldn't load the budget/i)).toBeInTheDocument();
  });

  it("scroll-reveals trip cards via framer-motion when reduced motion is not preferred", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    renderDashboard();
    const cardLink = screen.getByText("Japan Trip").closest("a");
    // framer-motion applies the `initial` style (opacity/transform) synchronously on mount,
    // which is how we can tell the card is wrapped in a scroll-driven motion.div.
    expect(cardLink?.parentElement?.getAttribute("style")).toContain("opacity");
  });

  it("registers no scroll-driven animation on trip cards when reduced motion is preferred", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    renderDashboard();
    const cardLink = screen.getByText("Japan Trip").closest("a");
    // No motion.div wrapper at all under reduced motion, so no framer-motion-applied
    // inline style exists anywhere between the card link and the grid container.
    expect(cardLink?.parentElement?.getAttribute("style")).toBeNull();
    expect(cardLink?.parentElement?.parentElement?.getAttribute("style")).toBeNull();
  });
});
