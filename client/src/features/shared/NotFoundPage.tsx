import { Link } from "react-router-dom";

/**
 * Catch-all for unmatched routes. Without this, React Router renders nothing
 * and the user just sees a blank page — indistinguishable from a crash.
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-board text-signal">Service disruption</p>
      <h1 className="mt-3 font-display text-4xl uppercase tracking-board sm:text-6xl">
        No route to this platform
      </h1>
      <p className="mt-4 max-w-md text-mute">
        This destination isn&apos;t on the board. Check the departure list and pick a service that
        is running.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/"
          className="rounded-sm bg-ink px-5 py-2.5 font-display text-sm uppercase tracking-board text-platform transition-colors hover:bg-board"
        >
          Departure board
        </Link>
        <Link
          to="/trips"
          className="rounded-sm border border-rail px-5 py-2.5 font-display text-sm uppercase tracking-board text-ink transition-colors hover:border-ink"
        >
          My trips
        </Link>
      </div>
    </div>
  );
}
