import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { RouteLine, type RouteStop } from "../../components/ui/RouteLine";

const sampleRoute: RouteStop[] = [
  { id: "1", label: "Lisbon", meta: "DEP 06:40 · LIS" },
  { id: "2", label: "Marrakesh", meta: "DEP 11:15 · RAK" },
  { id: "3", label: "Cairo", meta: "DEP 09:05 · CAI" },
  { id: "4", label: "Nairobi", meta: "ARR 21:30 · NBO" },
];

export function AuthLayout({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-5">
      <div className="order-2 hidden flex-col justify-between bg-ink px-10 py-12 text-platform md:order-1 md:col-span-2 md:flex">
        <Link
          to="/"
          className="font-display text-lg uppercase tracking-board text-platform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
        >
          GlobeTrotter
        </Link>
        <div aria-hidden>
          <p className="mb-6 font-mono text-xs uppercase tracking-board text-platform/60">
            Sample itinerary
          </p>
          <RouteLine stops={sampleRoute} compact />
        </div>
        <p aria-hidden className="font-mono text-xs text-platform/40">
          Plan multi-city trips down to the departure board.
        </p>
      </div>
      <div className="order-1 flex items-center justify-center bg-platform px-4 py-12 sm:px-6 md:order-2 md:col-span-3">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <h1 className="mb-1 font-display text-2xl uppercase tracking-board text-ink">
            {heading}
          </h1>
          <p className="mb-8 text-sm text-mute">{subheading}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
