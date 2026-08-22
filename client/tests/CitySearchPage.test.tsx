import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { CitySearchPage } from "../src/features/cities/CitySearchPage";
import { useCities, useCreateStop } from "../src/features/cities/useCities";
import { useTrip } from "../src/features/trips/useTrips";

vi.mock("../src/features/cities/useCities", () => ({
  useCities: vi.fn(),
  useCreateStop: vi.fn(),
}));

vi.mock("../src/features/trips/useTrips", () => ({
  useTrip: vi.fn(),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/trips/t1/cities"]}>
      <Routes>
        <Route path="/trips/:id/cities" element={<CitySearchPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const mutateAsync = vi.fn().mockResolvedValue({ id: "stop1" });

describe("CitySearchPage", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    mutateAsync.mockResolvedValue({ id: "stop1" });
    vi.mocked(useReducedMotion).mockReturnValue(false);
    vi.mocked(useCreateStop).mockReturnValue({ mutateAsync, isPending: false } as any);
    vi.mocked(useTrip).mockReturnValue({
      data: {
        id: "t1",
        name: "Iceland Loop",
        startDate: "2026-09-01T00:00:00.000Z",
        endDate: "2026-09-10T00:00:00.000Z",
        ownerId: "u1",
        stops: [{ id: "s1", tripId: "t1", cityId: "c0", orderIndex: 0, arrivalDate: "2026-09-01", departureDate: "2026-09-02" }],
      },
      isLoading: false,
      isError: false,
    } as any);
  });

  it("renders search results", async () => {
    vi.mocked(useCities).mockReturnValue({
      data: [
        { id: "c1", name: "Lisbon", country: "Portugal", region: "Europe", costIndex: 55, popularityScore: 88, imageUrl: null },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText("Lisbon")).toBeInTheDocument());
  });

  it("shows cost index and popularity score in font-mono", async () => {
    vi.mocked(useCities).mockReturnValue({
      data: [
        { id: "c1", name: "Lisbon", country: "Portugal", region: "Europe", costIndex: 55, popularityScore: 88, imageUrl: null },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    const cost = await screen.findByText("55");
    const popularity = screen.getByText("88");
    expect(cost.className).toContain("font-mono");
    expect(popularity.className).toContain("font-mono");
  });

  it("renders a city image when imageUrl is present", async () => {
    vi.mocked(useCities).mockReturnValue({
      data: [
        {
          id: "c1",
          name: "Lisbon",
          country: "Portugal",
          region: "Europe",
          costIndex: 55,
          popularityScore: 88,
          imageUrl: "https://example.com/lisbon.jpg",
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    const img = await screen.findByRole("img", { name: /lisbon/i });
    expect(img).toHaveAttribute("src", "https://example.com/lisbon.jpg");
  });

  it("renders no image frame when imageUrl is null", async () => {
    vi.mocked(useCities).mockReturnValue({
      data: [
        { id: "c1", name: "Lisbon", country: "Portugal", region: "Europe", costIndex: 55, popularityScore: 88, imageUrl: null },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    await screen.findByText("Lisbon");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("passes the search text through to useCities", async () => {
    vi.mocked(useCities).mockReturnValue({ data: [], isLoading: false, isError: false } as any);
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/search cities/i), { target: { value: "lis" } });
    await waitFor(() => {
      expect(useCities).toHaveBeenLastCalledWith("lis", undefined);
    });
  });

  it("passes the selected region through to useCities", async () => {
    vi.mocked(useCities).mockReturnValue({ data: [], isLoading: false, isError: false } as any);
    renderPage();
    fireEvent.change(screen.getByLabelText(/region/i), { target: { value: "Europe" } });
    await waitFor(() => {
      expect(useCities).toHaveBeenLastCalledWith("", "Europe");
    });
  });

  it("shows an honest empty state with no results", async () => {
    vi.mocked(useCities).mockReturnValue({ data: [], isLoading: false, isError: false } as any);
    renderPage();
    expect(await screen.findByText(/no cities found/i)).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    vi.mocked(useCities).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any);
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an honest error state", () => {
    vi.mocked(useCities).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    renderPage();
    expect(screen.getByText(/couldn't load cities/i)).toBeInTheDocument();
  });

  it("adds a city to the trip with the next order index and the chosen dates, defaulting to the trip's date range", async () => {
    vi.mocked(useCities).mockReturnValue({
      data: [
        { id: "c1", name: "Lisbon", country: "Portugal", region: "Europe", costIndex: 55, popularityScore: 88, imageUrl: null },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /add to trip/i }));

    const arrival = await screen.findByLabelText(/arrival date/i);
    const departure = screen.getByLabelText(/departure date/i);
    expect(arrival).toHaveValue("2026-09-01");
    expect(departure).toHaveValue("2026-09-10");

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        cityId: "c1",
        orderIndex: 1,
        arrivalDate: "2026-09-01",
        departureDate: "2026-09-10",
      });
    });
  });
});
