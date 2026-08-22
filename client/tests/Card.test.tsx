import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useReducedMotion } from "framer-motion";
import { Card } from "../src/components/ui/Card";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    useReducedMotion: vi.fn(),
    motion: {
      ...actual.motion,
      div: (props: Record<string, unknown>) => (
        <div data-testid="motion-div" {...props} />
      ),
    },
  };
});

describe("Card", () => {
  it("renders as a framer-motion element when reduced motion is not preferred", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    render(<Card>Content</Card>);
    expect(screen.getByTestId("motion-div")).toBeInTheDocument();
  });

  it("renders a plain, non-motion element with no scroll/hover animation registered when reduced motion is preferred", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<Card>Content</Card>);
    expect(screen.queryByTestId("motion-div")).not.toBeInTheDocument();
    const el = screen.getByText("Content").parentElement as HTMLElement;
    expect(el.tagName).toBe("DIV");
  });
});
