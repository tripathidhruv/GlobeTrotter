import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ItineraryViewPage } from "../src/features/itinerary/ItineraryViewPage";

const mockTrip = {
  id: "t1",
  name: "Japan Trip",
  description: null,
  startDate: "2026-09-01T00:00:00.000Z",
  endDate: "2026-09-03T00:00:00.000Z",
  collaborators: [],
  stops: [
    {
      id: "s1",
      tripId: "t1",
      cityId: "c1",
      orderIndex: 0,
      arrivalDate: "2026-09-01T00:00:00.000Z",
      departureDate: "2026-09-02T00:00:00.000Z",
      city: { id: "c1", name: "Tokyo", country: "Japan", region: "Kanto", imageUrl: null },
      activities: [
        {
          id: "sa1",
          scheduledDate: "2026-09-01T00:00:00.000Z",
          scheduledTime: "09:00",
          activity: {
            id: "a1",
            name: "Shibuya Crossing",
            category: "Sightseeing",
            estCost: 20,
            estDurationMinutes: 60,
          },
        },
      ],
    },
    {
      id: "s2",
      tripId: "t1",
      cityId: "c2",
      orderIndex: 1,
      arrivalDate: "2026-09-02T00:00:00.000Z",
      departureDate: "2026-09-03T00:00:00.000Z",
      city: { id: "c2", name: "Kyoto", country: "Japan", region: "Kansai", imageUrl: null },
      activities: [],
    },
  ],
};

let mockState: { data: unknown; isLoading: boolean; isError: boolean } = {
  data: mockTrip,
  isLoading: false,
  isError: false,
};

vi.mock("../src/features/itinerary/useTrip", () => ({
  useTrip: () => mockState,
}));

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/trips/t1"]}>
        <Routes>
          <Route path="/trips/:id" element={<ItineraryViewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ItineraryViewPage", () => {
  it("renders the trip name, stops, and mode toggle", () => {
    mockState = { data: mockTrip, isLoading: false, isError: false };
    renderPage();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
    expect(screen.getAllByText(/Tokyo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kyoto/).length).toBeGreaterThan(0);
    expect(screen.getByText("Shibuya Crossing")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Day by day" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "By city" })).toBeInTheDocument();
  });

  it("switches to the grouped-by-city view when toggled", () => {
    mockState = { data: mockTrip, isLoading: false, isError: false };
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "By city" }));
    expect(screen.getByRole("tab", { name: "By city" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows an error state when the trip fails to load", () => {
    mockState = { data: undefined, isLoading: false, isError: true };
    renderPage();
    expect(screen.getByText(/Couldn't load this itinerary/i)).toBeInTheDocument();
  });

  it("shows a loading state while the trip is fetching", () => {
    mockState = { data: undefined, isLoading: true, isError: false };
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
