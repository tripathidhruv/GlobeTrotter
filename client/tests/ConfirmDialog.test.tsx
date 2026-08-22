import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { ConfirmDialog } from "../src/components/ui/ConfirmDialog";

function Harness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={(e) => {
          // A real click focuses the button by default in browsers; jsdom's fireEvent.click
          // does not, so make it explicit to exercise the dialog's focus-restore behavior.
          e.currentTarget.focus();
          setOpen(true);
        }}
      >
        Open dialog
      </button>
      <ConfirmDialog
        open={open}
        title="Delete this thing?"
        description="This cannot be undone."
        confirmLabel="Confirm delete"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes role=dialog, aria-modal, and an accessible name, and moves focus into itself on open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = screen.getByRole("dialog", { name: /delete this thing\?/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
  });

  it("closes on Escape and restores focus to the trigger", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("traps Tab focus so it wraps from the last to the first focusable element", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm delete" });

    confirmButton.focus();
    expect(confirmButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancelButton).toHaveFocus();
  });

  it("traps Shift+Tab focus so it wraps from the first to the last focusable element", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm delete" });

    cancelButton.focus();
    expect(cancelButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(confirmButton).toHaveFocus();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
