import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { MyTripsPage } from "../src/features/trips/MyTripsPage";
import { useTrips, useDeleteTrip } from "../src/features/trips/useTrips";

vi.mock("../src/features/trips/useTrips", () => ({
  useTrips: vi.fn(),
  useDeleteTrip: vi.fn(),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: vi.fn() };
});

const mutate = vi.fn();

function renderPage() {
  render(
    <MemoryRouter>
      <MyTripsPage />
    </MemoryRouter>
  );
}

describe("MyTripsPage", () => {
  beforeEach(() => {
    mutate.mockClear();
    vi.mocked(useDeleteTrip).mockReturnValue({ mutate, isPending: false } as any);
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it("renders trip cards with destination count in font-mono", () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
    // The stop count now renders zero-padded on the card's image badge.
    const count = screen.getByText("03 STOPS");
    expect(count.className).toContain("font-mono");
  });

  it("renders a cover photo image when coverPhotoUrl is present", () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          coverPhotoUrl: "https://example.com/photo.jpg",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    const img = document.querySelector('img[src="https://example.com/photo.jpg"]');
    expect(img).not.toBeNull();
  });

  it("renders no image frame when coverPhotoUrl is null", () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          coverPhotoUrl: null,
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();
    expect(document.querySelector("img")).toBeNull();
  });

  it("renders an honest empty state with no trips", () => {
    vi.mocked(useTrips).mockReturnValue({ data: [], isLoading: false, isError: false } as any);
    renderPage();
    expect(screen.getByText(/no trips yet/i)).toBeInTheDocument();
  });

  it("requires confirmation before deleting a trip", async () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    // Not deleted yet — confirmation required first.
    expect(mutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/delete this trip\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith("1", expect.anything());
    });
  });

  it("cancels deletion without calling mutate", async () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(await screen.findByText(/delete this trip\?/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/delete this trip\?/i)).not.toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("renders the delete confirmation as an accessible dialog and restores focus to the trigger on cancel", async () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);

    const dialog = await screen.findByRole("dialog", { name: /delete this trip\?/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });

  it("cancels the delete confirmation on Escape and restores focus to the trigger", async () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    fireEvent.click(deleteButton);
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows a busy, pending label on the confirm button while deletion is in flight", async () => {
    vi.mocked(useDeleteTrip).mockReturnValue({ mutate, isPending: true } as any);
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await screen.findByRole("dialog");

    const pendingButton = screen.getByRole("button", { name: /deleting/i });
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
  });

  it("hides the cover image frame if the image fails to load", () => {
    vi.mocked(useTrips).mockReturnValue({
      data: [
        {
          id: "1",
          name: "Japan Trip",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
          ownerId: "u1",
          coverPhotoUrl: "https://example.com/broken.jpg",
          _count: { stops: 3 },
        },
      ],
      isLoading: false,
      isError: false,
    } as any);
    renderPage();

    // The same photo also backs the page hero, so scope to the card image.
    const cardImg = document.querySelector(
      'img[src="https://example.com/broken.jpg"].h-48'
    ) as HTMLImageElement;
    expect(cardImg).not.toBeNull();
    fireEvent.error(cardImg);
    // The broken photo is swapped for a plain block so the card keeps its shape.
    expect(document.querySelector('img[src="https://example.com/broken.jpg"].h-48')).toBeNull();
  });
});
