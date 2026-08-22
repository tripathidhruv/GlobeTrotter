import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { ActivitySearchPage } from "../src/features/activities/ActivitySearchPage";
import { useTrip } from "../src/features/itinerary/useTrip";
import { useActivities, useAttachActivity, useDetachActivity } from "../src/features/activities/useActivities";

vi.mock("../src/features/itinerary/useTrip", () => ({
  useTrip: vi.fn(),
}));

vi.mock("../src/features/activities/useActivities", () => ({
  useActivities: vi.fn(),
  useAttachActivity: vi.fn(),
  useDetachActivity: vi.fn(),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

const mockTrip = {
  id: "t1",
  name: "Japan Trip",
  description: null,
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
      city: { id: "c1", name: "Tokyo", country: "Japan", region: "Kanto", imageUrl: null },
      activities: [
        {
          id: "sa1",
          scheduledDate: "2026-09-01T00:00:00.000Z",
          scheduledTime: "09:00",
          activity: {
            id: "a1",
            name: "Shibuya Crossing",
            category: "sightseeing",
            estCost: 0,
            estDurationMinutes: 60,
          },
        },
      ],
    },
  ],
};

const availableActivities = [
  {
    id: "a2",
    cityId: "c1",
    name: "Tsukiji Food Tour",
    category: "food",
    description: "Taste your way through the market.",
    imageUrl: null,
    estCost: 45,
    estDurationMinutes: 120,
  },
];

const attachMutateAsync = vi.fn().mockResolvedValue({ id: "sa2" });
const detachMutate = vi.fn();

function renderPage(path = "/trips/t1/activities") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/trips/:id/activities" element={<ActivitySearchPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ActivitySearchPage", () => {
  beforeEach(() => {
    attachMutateAsync.mockClear();
    attachMutateAsync.mockResolvedValue({ id: "sa2" });
    detachMutate.mockClear();
    vi.mocked(useReducedMotion).mockReturnValue(false);
    vi.mocked(useTrip).mockReturnValue({ data: mockTrip, isLoading: false, isError: false } as any);
    vi.mocked(useActivities).mockReturnValue({
      data: availableActivities,
      isLoading: false,
      isError: false,
    } as any);
    vi.mocked(useAttachActivity).mockReturnValue({
      mutateAsync: attachMutateAsync,
      isPending: false,
    } as any);
    vi.mocked(useDetachActivity).mockReturnValue({ mutate: detachMutate, isPending: false } as any);
  });

  it("renders the trip, stop selector, and available activities", async () => {
    renderPage();
    expect(await screen.findByText("Japan Trip")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Tokyo/i })).toBeInTheDocument();
    expect(screen.getByText("Tsukiji Food Tour")).toBeInTheDocument();
  });

  it("shows already-attached activities with a remove action", async () => {
    renderPage();
    expect(await screen.findByText("Shibuya Crossing")).toBeInTheDocument();
    expect(screen.getByText(/already attached/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(detachMutate).toHaveBeenCalledWith("sa1");
  });

  it("shows cost and duration in font-mono", async () => {
    renderPage();
    const duration = await screen.findByText("120min");
    const cost = screen.getByText("$45");
    expect(duration.className).toContain("font-mono");
    expect(cost.className).toContain("font-mono");
  });

  it("expands to show the description as a quick view", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Tsukiji Food Tour"));
    expect(await screen.findByText(/taste your way through the market/i)).toBeInTheDocument();
  });

  it("passes category and cost filters through to useActivities", async () => {
    renderPage();
    await screen.findByText("Tsukiji Food Tour");

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "food" } });
    await waitFor(() => {
      expect(useActivities).toHaveBeenLastCalledWith("c1", "food", undefined);
    });

    fireEvent.change(screen.getByLabelText(/max cost/i), { target: { value: "50" } });
    await waitFor(() => {
      expect(useActivities).toHaveBeenLastCalledWith("c1", "food", 50);
    });
  });

  it("attaches an activity to the selected stop with a scheduled date", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /^add$/i }));

    const dateInput = await screen.findByLabelText(/^date$/i);
    expect(dateInput).toHaveValue("2026-09-01");

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(attachMutateAsync).toHaveBeenCalledWith({
        stopId: "s1",
        activityId: "a2",
        scheduledDate: "2026-09-01",
        scheduledTime: undefined,
      });
    });
  });

  it("preselects the stop from the ?stop= query param", async () => {
    const tripWithTwoStops = {
      ...mockTrip,
      stops: [
        ...mockTrip.stops,
        {
          id: "s2",
          tripId: "t1",
          cityId: "c2",
          orderIndex: 1,
          arrivalDate: "2026-09-04T00:00:00.000Z",
          departureDate: "2026-09-06T00:00:00.000Z",
          city: { id: "c2", name: "Kyoto", country: "Japan", region: "Kansai", imageUrl: null },
          activities: [],
        },
      ],
    };
    vi.mocked(useTrip).mockReturnValue({ data: tripWithTwoStops, isLoading: false, isError: false } as any);
    renderPage("/trips/t1/activities?stop=s2");
    await waitFor(() => {
      expect(useActivities).toHaveBeenLastCalledWith("c2", undefined, undefined);
    });
  });

  it("shows a loading state", () => {
    vi.mocked(useTrip).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any);
    renderPage();
    expect(screen.getByText(/loading trip/i)).toBeInTheDocument();
  });

  it("prompts to add a city first when the trip has no stops", async () => {
    vi.mocked(useTrip).mockReturnValue({
      data: { ...mockTrip, stops: [] },
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    expect(await screen.findByText(/add a city to this trip/i)).toBeInTheDocument();
  });

  it("shows an honest empty state when no activities match", async () => {
    vi.mocked(useActivities).mockReturnValue({ data: [], isLoading: false, isError: false } as any);
    renderPage();
    expect(await screen.findByText(/no activities found/i)).toBeInTheDocument();
  });
});
