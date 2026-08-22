import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteLine } from "../src/components/ui/RouteLine";

const stops = [
  { id: "s1", label: "Tokyo", meta: "4 nights" },
  { id: "s2", label: "Kyoto", meta: "3 nights" },
];

describe("RouteLine", () => {
  it("renders each stop with a zero-padded sequence number", () => {
    render(<RouteLine stops={stops} />);
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("renders stops as an ordered list, since itinerary order is meaningful", () => {
    render(<RouteLine stops={stops} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });
});
