import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";
import { Button } from "../../components/ui/Button";
import { useAiSuggest, type AiSuggestion } from "./useAiSuggest";
import type { TripDetail } from "../itinerary/useTrip";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const THINKING_LINES = [
  "Reading the catalogue...",
  "Cross-checking cities...",
  "Matching activities...",
  "Drafting suggestions...",
];

function ThinkingState({ reduce }: { reduce: boolean }) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((i) => (i + 1) % THINKING_LINES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  if (reduce) {
    return (
      <div aria-live="polite" className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-board text-mute">
          {THINKING_LINES[lineIndex]}
        </p>
      </div>
    );
  }

  return (
    <div aria-live="polite" className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-sm bg-signal"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={lineIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="font-mono text-xs uppercase tracking-board text-mute"
        >
          {THINKING_LINES[lineIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  reduce,
  index,
  onAdd,
  isAdding,
  added,
}: {
  suggestion: AiSuggestion;
  reduce: boolean;
  index: number;
  onAdd: () => void;
  isAdding: boolean;
  added: boolean;
}) {
  const content = (
    <div className="rounded-sm border border-rail bg-platform p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base uppercase tracking-board text-ink">
            {suggestion.cityName}
          </h3>
          <p className="font-mono text-xs text-mute">{suggestion.country}</p>
        </div>
        <span className="flex-shrink-0 font-mono text-xs uppercase tracking-board text-transit">
          {suggestion.suggestedNights} <span className="text-mute">nights</span>
        </span>
      </div>

      {suggestion.reason && <p className="mt-2 text-sm text-ink">{suggestion.reason}</p>}

      {suggestion.activityNames.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-rail pt-2">
          {suggestion.activityNames.map((name) => (
            <li key={name} className="truncate text-sm text-mute">
              · {name}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <Button
          type="button"
          variant={added ? "secondary" : "primary"}
          onClick={onAdd}
          disabled={isAdding || added}
          aria-busy={isAdding}
          className="w-full"
        >
          {added ? "Added" : isAdding ? "Adding..." : "Add to trip"}
        </Button>
      </div>
    </div>
  );

  if (reduce) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 380, damping: 28 }}
    >
      {content}
    </motion.div>
  );
}

export interface AiSuggestPanelProps {
  open: boolean;
  tripId: string;
  trip?: TripDetail;
  onClose: () => void;
}

export function AiSuggestPanel({ open, tripId, trip, onClose }: AiSuggestPanelProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion() ?? false;
  const queryClient = useQueryClient();

  const { mutate: suggest, data, isPending, isError, error, reset } = useAiSuggest();
  const [addedCityIds, setAddedCityIds] = useState<Set<string>>(new Set());

  const addStop = useMutation({
    mutationFn: ({
      cityId,
      orderIndex,
      arrivalDate,
      departureDate,
    }: {
      cityId: string;
      orderIndex: number;
      arrivalDate: string;
      departureDate: string;
    }) =>
      apiFetch(`/trips/${tripId}/stops`, {
        method: "POST",
        body: JSON.stringify({ cityId, orderIndex, arrivalDate, departureDate }),
      }),
    onSuccess: (_, variables) => {
      setAddedCityIds((prev) => new Set(prev).add(variables.cityId));
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });

  useEffect(() => {
    if (open) {
      suggest({ tripId });
      setAddedCityIds(new Set());
    } else {
      reset();
    }
    // Only re-run when the dialog opens/closes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tripId]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
  }, [open, onClose]);

  if (!open) return null;

  function nextStopDates(nights: number): { arrivalDate: string; departureDate: string } {
    const existingStops = trip?.stops ?? [];
    const lastDeparture = existingStops.length > 0
      ? existingStops.reduce(
          (latest, s) => (s.departureDate > latest ? s.departureDate : latest),
          existingStops[0]!.departureDate
        )
      : trip?.startDate;

    const start = lastDeparture ? new Date(lastDeparture) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(1, nights));

    return {
      arrivalDate: start.toISOString().slice(0, 10),
      departureDate: end.toISOString().slice(0, 10),
    };
  }

  function handleAdd(suggestion: AiSuggestion) {
    const orderIndex = (trip?.stops.length ?? 0) + addedCityIds.size;
    const { arrivalDate, departureDate } = nextStopDates(suggestion.suggestedNights);
    addStop.mutate({ cityId: suggestion.cityId, orderIndex, arrivalDate, departureDate });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-sm border border-rail bg-board p-6 outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-board text-signal">AI suggest</p>
            <h2 id={titleId} className="mt-1 font-display text-lg uppercase tracking-board text-platform">
              Route ideas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-board text-rail transition-colors hover:text-platform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          {isPending && <ThinkingState reduce={reduce} />}

          {isError && !isPending && (
            <div className="py-8 text-center">
              <p role="alert" className="text-sm text-signal">
                {error instanceof Error ? error.message : "Couldn't get suggestions right now."}
              </p>
              <div className="mt-4">
                <Button type="button" variant="secondary" onClick={() => suggest({ tripId })}>
                  Try again
                </Button>
              </div>
            </div>
          )}

          {data && !isPending && !isError && (
            <>
              {data.summary && (
                <p className="mb-4 text-sm text-platform/90">{data.summary}</p>
              )}
              <div className="space-y-3">
                {data.suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.cityId}
                    suggestion={suggestion}
                    reduce={reduce}
                    index={index}
                    onAdd={() => handleAdd(suggestion)}
                    isAdding={addStop.isPending && addStop.variables?.cityId === suggestion.cityId}
                    added={addedCityIds.has(suggestion.cityId)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
