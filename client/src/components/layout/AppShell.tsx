import { ReactNode, useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Board" },
  { to: "/trips", label: "My Trips" },
  { to: "/trips/new", label: "Plan Trip" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "relative py-1 font-display text-xs uppercase tracking-board transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit",
    isActive ? "text-platform" : "text-platform/60 hover:text-platform",
    isActive
      ? "after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2px] after:bg-signal"
      : "",
  ].join(" ");
}

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-GB", { hour12: false });

  return (
    <span aria-hidden className="hidden font-mono text-xs text-platform/60 sm:inline">
      {time}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-platform">
      <header className="bg-ink px-4 py-3 text-platform sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Link
            to="/"
            className="font-display text-lg uppercase tracking-board text-platform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
          >
            GlobeTrotter
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-5 sm:flex-none">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Clock />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
