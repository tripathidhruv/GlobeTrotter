import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { BudgetPage } from "../src/features/budget/BudgetPage";
import { useTripBudget } from "../src/features/budget/useTripBudget";
import { useTrip } from "../src/features/itinerary/useTrip";

vi.mock("../src/features/budget/useTripBudget", () => ({ useTripBudget: vi.fn() }));
vi.mock("../src/features/itinerary/useTrip", () => ({ useTrip: vi.fn() }));

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

const trip = {
  id: "trip-1",
  name: "Japan Trip",
  description: null,
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-09-10T00:00:00.000Z",
  stops: [
    {
      id: "s1",
      tripId: "trip-1",
      cityId: "c1",
      orderIndex: 0,
      arrivalDate: "2026-09-01T00:00:00.000Z",
      departureDate: "2026-09-05T00:00:00.000Z",
      city: {
        id: "c1",
        name: "Tokyo",
        country: "Japan",
        region: null,
        imageUrl: "https://example.com/tokyo.jpg",
      },
      activities: [],
    },
  ],
  collaborators: [],
};

const budget = {
  totalCost: 4500,
  byCategory: {
    transport: 1000,
    stay: 2000,
    activities: 1000,
    meals: 500,
  },
  byDay: {
    "2026-09-01": 300,
    "2026-09-02": 300,
    "2026-09-03": 1200,
    "2026-09-04": 300,
  },
};

function renderBudgetPage() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/trips/trip-1/budget"]}>
        <Routes>
          <Route path="/trips/:id/budget" element={<BudgetPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("BudgetPage", () => {
  beforeEach(() => {
    vi.mocked(useTrip).mockReturnValue({
      data: trip,
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useTripBudget).mockReturnValue({
      data: budget,
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  it("renders the trip name and total cost in font-mono", () => {
    renderBudgetPage();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
    const total = screen.getByText("$4,500");
    expect(total).toBeInTheDocument();
    expect(total.className).toContain("font-mono");
  });

  it("renders the average cost per day", () => {
    renderBudgetPage();
    // (300 + 300 + 1200 + 300) / 4 = 525
    expect(screen.getByText("$525")).toBeInTheDocument();
  });

  it("flags the over-budget day and states the threshold", () => {
    renderBudgetPage();
    // 1200 > 525 * 1.5 (787.5) -> flagged
    expect(screen.getAllByText(/over budget/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/150%/)).toBeInTheDocument();
  });

  it("renders category breakdown labels", () => {
    renderBudgetPage();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("Stay")).toBeInTheDocument();
    expect(screen.getByText("Activities")).toBeInTheDocument();
    expect(screen.getByText("Meals")).toBeInTheDocument();
  });

  it("renders an honest loading state", () => {
    vi.mocked(useTrip).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any);
    vi.mocked(useTripBudget).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any);
    renderBudgetPage();
    expect(screen.queryByText("Japan Trip")).not.toBeInTheDocument();
    expect(screen.queryByText("$4,500")).not.toBeInTheDocument();
  });

  it("renders an honest error state when the budget fails to load", () => {
    vi.mocked(useTripBudget).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    renderBudgetPage();
    expect(screen.queryByText("$4,500")).not.toBeInTheDocument();
    expect(screen.getByText(/couldn't load the budget/i)).toBeInTheDocument();
  });

  it("renders an honest error state when the trip fails to load", () => {
    vi.mocked(useTrip).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    renderBudgetPage();
    expect(screen.queryByText("Japan Trip")).not.toBeInTheDocument();
    expect(screen.getByText(/couldn't load the budget/i)).toBeInTheDocument();
  });

  it("does not render a motion-applied inline style under reduced motion", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    renderBudgetPage();
    const heading = screen.getByText("By category");
    // No motion.div wrapper -> no framer-motion-applied inline style on ancestor section.
    expect(heading.parentElement?.getAttribute("style")).toBeNull();
  });

  it("applies a motion-driven inline style when reduced motion is not preferred", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    renderBudgetPage();
    const heading = screen.getByText("By category");
    expect(heading.parentElement?.getAttribute("style")).toContain("opacity");
  });
});
