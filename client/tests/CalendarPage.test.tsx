import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { CalendarPage } from "../src/features/calendar/CalendarPage";

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
      <MemoryRouter initialEntries={["/trips/t1/calendar"]}>
        <Routes>
          <Route path="/trips/:id/calendar" element={<CalendarPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CalendarPage", () => {
  it("renders the trip name, date range, and view mode toggle", () => {
    mockState = { data: mockTrip, isLoading: false, isError: false };
    renderPage();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Month grid/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Timeline/i })).toBeInTheDocument();
  });

  it("renders a month grid with a button for each in-range day", () => {
    mockState = { data: mockTrip, isLoading: false, isError: false };
    renderPage();
    // Sept 1 is in Tokyo, has 1 activity
    const day1 = screen.getByRole("button", {
      name: (name) => /September/i.test(name) && /Tokyo/.test(name) && /1 activity/.test(name),
    });
    expect(day1).toBeInTheDocument();
  });

  it("opens a day detail modal when a day cell is clicked", () => {
    mockState = { data: mockTrip, isLoading: false, isError: false };
    renderPage();
    const day1 = screen.getByRole("button", {
      name: (name) => /September/i.test(name) && /Tokyo/.test(name) && /1 activity/.test(name),
    });
    fireEvent.click(day1);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Shibuya Crossing")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("switches to timeline view and expands a day", () => {
    mockState = { data: mockTrip, isLoading: false, isError: false };
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Timeline/i }));

    const toggles = screen.getAllByRole("button", {
      expanded: false,
      name: (name) => /Tokyo/.test(name),
    });
    fireEvent.click(toggles[0]);
    expect(screen.getByText("Shibuya Crossing")).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    mockState = { data: undefined, isLoading: true, isError: false };
    renderPage();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockState = { data: undefined, isLoading: false, isError: true };
    renderPage();
    expect(screen.getByText(/Couldn't load this trip's calendar/i)).toBeInTheDocument();
  });
});
