import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CreateTripPage } from "../src/features/trips/CreateTripPage";

const mutateAsync = vi.fn().mockResolvedValue({ id: "1" });
vi.mock("../src/features/trips/useTrips", () => ({
  useCreateTrip: () => ({ mutateAsync }),
}));

describe("CreateTripPage", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
    mutateAsync.mockResolvedValue({ id: "1" });
  });

  it("submits trip name and dates", async () => {
    render(<MemoryRouter><CreateTripPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Trip name"), { target: { value: "Iceland Loop" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save trip" }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "Iceland Loop",
        startDate: "2026-08-01",
        endDate: "2026-08-10",
        description: "",
        coverPhotoUrl: undefined,
      });
    });
  });

  it("submits a cover photo URL when provided", async () => {
    render(<MemoryRouter><CreateTripPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Trip name"), { target: { value: "Iceland Loop" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("Cover photo URL"), {
      target: { value: "https://example.com/photo.jpg" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save trip" }));
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ coverPhotoUrl: "https://example.com/photo.jpg" })
      );
    });
  });

  it("shows an inline error and does not submit when name is empty", async () => {
    render(<MemoryRouter><CreateTripPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save trip" }));
    expect(await screen.findByText(/trip name is required/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows an inline error and does not submit when end date is before start date", async () => {
    render(<MemoryRouter><CreateTripPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Trip name"), { target: { value: "Iceland Loop" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save trip" }));
    expect(await screen.findByText(/end date must be on or after the start date/i)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("surfaces a server error instead of swallowing it", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("Request failed: 500"));
    render(<MemoryRouter><CreateTripPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Trip name"), { target: { value: "Iceland Loop" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-08-01" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-08-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save trip" }));
    expect(await screen.findByText(/couldn't save this trip/i)).toBeInTheDocument();
  });
});
