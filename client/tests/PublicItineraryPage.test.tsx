import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { PublicItineraryPage } from "../src/features/share/PublicItineraryPage";
import { usePublicTrip } from "../src/features/share/useShare";

vi.mock("../src/features/share/useShare", () => ({ usePublicTrip: vi.fn() }));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

const trip = {
  id: "trip-1",
  name: "Japan Trip",
  description: null,
  coverPhotoUrl: null,
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
      activities: [
        {
          id: "sa1",
          scheduledDate: "2026-09-01T00:00:00.000Z",
          scheduledTime: "10:00",
          activity: {
            id: "a1",
            name: "Shibuya Crossing",
            category: "sightseeing",
            estCost: 0,
            estDurationMinutes: 30,
          },
        },
      ],
    },
  ],
};

function renderPage(slug = "abc123") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/share/${slug}`]}>
        <Routes>
          <Route path="/share/:slug" element={<PublicItineraryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PublicItineraryPage", () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders the itinerary for a valid public trip without requiring auth", () => {
    vi.mocked(usePublicTrip).mockReturnValue({
      data: trip,
      isLoading: false,
      isError: false,
    } as never);

    renderPage();

    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
    expect(screen.getByText("Shibuya Crossing")).toBeInTheDocument();
  });

  it("shows a not-found state instead of crashing when the trip is missing or private", () => {
    vi.mocked(usePublicTrip).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    renderPage("does-not-exist");

    expect(screen.getByText("Itinerary not found")).toBeInTheDocument();
  });

  it("shows a loading state while fetching", () => {
    vi.mocked(usePublicTrip).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);

    renderPage();

    expect(screen.getByText(/Loading itinerary/)).toBeInTheDocument();
  });
});
