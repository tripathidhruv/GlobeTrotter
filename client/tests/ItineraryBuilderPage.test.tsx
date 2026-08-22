import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ItineraryBuilderPage } from "../src/features/itinerary/ItineraryBuilderPage";

vi.mock("../src/features/itinerary/useTrip", () => ({
  useTrip: () => ({
    data: {
      id: "t1",
      name: "Japan Trip",
      startDate: "2026-09-01T00:00:00.000Z",
      endDate: "2026-09-10T00:00:00.000Z",
      collaborators: [],
      stops: [
        {
          id: "s1",
          tripId: "t1",
          cityId: "c1",
          orderIndex: 0,
          arrivalDate: "2026-09-01T00:00:00.000Z",
          departureDate: "2026-09-03T00:00:00.000Z",
          city: { id: "c1", name: "Tokyo", country: "Japan", region: null, imageUrl: null },
          activities: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useReorderStop: () => ({ mutate: vi.fn() }),
  useDeleteStop: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("ItineraryBuilderPage", () => {
  it("renders stops for the trip", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/trips/t1/build"]}>
          <Routes>
            <Route path="/trips/:id/build" element={<ItineraryBuilderPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
  });
});
