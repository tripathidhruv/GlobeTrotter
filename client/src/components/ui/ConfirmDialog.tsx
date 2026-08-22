import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pendingLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A shared, accessible confirmation modal for destructive actions.
 *
 * - `role="dialog"` + `aria-modal="true"`, named via `aria-labelledby`.
 * - Moves focus into the dialog on open and traps Tab navigation inside it.
 * - Escape cancels.
 * - Restores focus to whatever was focused before the dialog opened (the trigger)
 *   when the dialog closes, for any reason.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  pendingLabel = "Working...",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-sm rounded-sm border border-rail bg-platform p-6 outline-none"
      >
        <h2 id={titleId} className="font-display text-lg uppercase tracking-board text-ink">
          {title}
        </h2>
        <div className="mt-2 text-sm text-mute">{description}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming}
          >
            {isConfirming ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
