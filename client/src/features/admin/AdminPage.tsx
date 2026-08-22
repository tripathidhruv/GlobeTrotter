import { motion, useReducedMotion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAdminStats, useAdminUsers, type AdminUser } from "./useAdminStats";

const PALETTE = ["#FFB000", "#1B4DFF", "#0E1116", "#6B747C", "#2A3138"];

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });

function formatDay(iso: string) {
  return dateFmt.format(new Date(iso));
}

function isForbiddenError(error: unknown) {
  return error instanceof Error && error.message.includes("admin access required");
}

function RevealSection({
  children,
  reduce,
  delay = 0,
}: {
  children: React.ReactNode;
  reduce: boolean;
  delay?: number;
}) {
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.45, delay }}
    >
      {children}
    </motion.div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-rail bg-platform p-6">
      <p className="font-mono text-[11px] uppercase tracking-board text-mute">{label}</p>
      <p className="mt-2 font-mono text-4xl tabular-nums text-ink">{value}</p>
    </div>
  );
}

function RankedRow({
  index,
  primary,
  secondary,
  value,
  valueLabel,
}: {
  index: number;
  primary: string;
  secondary?: string;
  value: number;
  valueLabel: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-5 border-b border-rail py-4">
      <span className="font-mono text-sm text-signal">{String(index + 1).padStart(2, "0")}</span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg uppercase tracking-board text-ink">
          {primary}
        </span>
        {secondary && <span className="block font-mono text-xs text-mute">{secondary}</span>}
      </span>
      <span className="whitespace-nowrap font-mono text-sm text-ink">
        <span className="tabular-nums text-signal">{value}</span>{" "}
        <span className="text-[10px] uppercase text-mute">{valueLabel}</span>
      </span>
    </div>
  );
}

function UserTable({ users }: { users: AdminUser[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-3 pr-4 font-mono text-[11px] uppercase tracking-board text-mute">
              User
            </th>
            <th className="py-3 pr-4 font-mono text-[11px] uppercase tracking-board text-mute">
              Role
            </th>
            <th className="py-3 pr-4 font-mono text-[11px] uppercase tracking-board text-mute">
              Lang
            </th>
            <th className="py-3 pr-4 font-mono text-[11px] uppercase tracking-board text-mute">
              Joined
            </th>
            <th className="py-3 text-right font-mono text-[11px] uppercase tracking-board text-mute">
              Trips
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-rail transition-colors hover:bg-rail/30">
              <td className="py-3 pr-4">
                <span className="block text-ink">{u.name ?? u.email}</span>
                <span className="block text-xs text-mute">{u.email}</span>
              </td>
              <td className="py-3 pr-4 uppercase text-mute">
                <span className={u.role === "admin" ? "text-signal" : "text-mute"}>{u.role}</span>
              </td>
              <td className="py-3 pr-4 uppercase text-mute">{u.languagePref}</td>
              <td className="py-3 pr-4 text-mute">{formatDay(u.createdAt)}</td>
              <td className="py-3 text-right tabular-nums text-ink">{u.tripCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotAuthorised() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-board text-signal">Access denied</p>
      <h1 className="mt-4 font-display text-4xl uppercase tracking-board text-ink">
        Not authorised
      </h1>
      <p className="mt-4 text-mute">
        This board is restricted to admin accounts. Ask an existing admin to grant access if you
        believe this is a mistake.
      </p>
    </div>
  );
}

export function AdminPage() {
  const reduce = useReducedMotion() ?? false;
  const statsQuery = useAdminStats();
  const usersQuery = useAdminUsers(1, 20);

  if (isForbiddenError(statsQuery.error) || isForbiddenError(usersQuery.error)) {
    return <NotAuthorised />;
  }

  const stats = statsQuery.data;
  const usersPage = usersQuery.data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="border-b-2 border-ink pb-4">
        <p className="font-mono text-xs uppercase tracking-board text-signal">Control room</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-board text-ink sm:text-5xl">
          Admin board
        </h1>
        <p className="mt-3 max-w-2xl text-mute">
          Trips created, top cities and activities, and the full user roster — all in one place.
        </p>
      </div>

      {(statsQuery.isLoading || usersQuery.isLoading) && (
        <div className="mt-10 space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-sm bg-board/20" />
          ))}
        </div>
      )}

      {statsQuery.isError && !statsQuery.isLoading && (
        <p className="mt-10 font-mono text-sm text-signal">
          Couldn&apos;t load admin stats right now. Please try again shortly.
        </p>
      )}

      {stats && !statsQuery.isLoading && !statsQuery.isError && (
        <>
          {/* Stat tiles */}
          <RevealSection reduce={reduce}>
            <div className="mt-10 grid grid-cols-2 gap-px bg-rail sm:grid-cols-4">
              <StatTile label="Total users" value={String(stats.totalUsers)} />
              <StatTile label="Total trips" value={String(stats.totalTrips)} />
              <StatTile label="Total stops" value={String(stats.totalStops)} />
              <StatTile
                label="Avg stops / trip"
                value={stats.averageStopsPerTrip.toFixed(1)}
              />
            </div>
          </RevealSection>

          {/* Trips over time */}
          <RevealSection reduce={reduce} delay={0.05}>
            <section className="mt-16">
              <div className="flex items-end justify-between border-b border-rail pb-3">
                <h2 className="font-display text-2xl uppercase tracking-board text-ink">
                  Trips created over time
                </h2>
                <span className="font-mono text-xs uppercase text-mute">By day</span>
              </div>

              {stats.tripsOverTime.length === 0 ? (
                <p className="py-8 text-mute">No trips created yet.</p>
              ) : (
                <div className="mt-6" style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.tripsOverTime}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDay}
                        tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: "#6B747C" }}
                        axisLine={{ stroke: "#D3D8DD" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, fill: "#6B747C" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip labelFormatter={formatDay} />
                      <Bar dataKey="count" isAnimationActive={!reduce} radius={[2, 2, 0, 0]}>
                        {stats.tripsOverTime.map((entry, i) => (
                          <Cell key={entry.date} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </RevealSection>

          {/* Top cities / activities */}
          <div className="mt-16 grid gap-10 sm:grid-cols-2">
            <RevealSection reduce={reduce} delay={0.1}>
              <section>
                <div className="flex items-end justify-between border-b border-rail pb-3">
                  <h2 className="font-display text-2xl uppercase tracking-board text-ink">
                    Top cities
                  </h2>
                  <span className="font-mono text-xs uppercase text-mute">By stops</span>
                </div>
                {stats.topCities.length === 0 ? (
                  <p className="py-8 text-mute">No stops yet.</p>
                ) : (
                  <div className="mt-2">
                    {stats.topCities.map((city, i) => (
                      <RankedRow
                        key={city.cityId}
                        index={i}
                        primary={city.name}
                        secondary={city.country}
                        value={city.stopCount}
                        valueLabel="stops"
                      />
                    ))}
                  </div>
                )}
              </section>
            </RevealSection>

            <RevealSection reduce={reduce} delay={0.15}>
              <section>
                <div className="flex items-end justify-between border-b border-rail pb-3">
                  <h2 className="font-display text-2xl uppercase tracking-board text-ink">
                    Top activities
                  </h2>
                  <span className="font-mono text-xs uppercase text-mute">By attaches</span>
                </div>
                {stats.topActivities.length === 0 ? (
                  <p className="py-8 text-mute">No activities attached yet.</p>
                ) : (
                  <div className="mt-2">
                    {stats.topActivities.map((activity, i) => (
                      <RankedRow
                        key={activity.activityId}
                        index={i}
                        primary={activity.name}
                        secondary={activity.category}
                        value={activity.attachCount}
                        valueLabel="uses"
                      />
                    ))}
                  </div>
                )}
              </section>
            </RevealSection>
          </div>
        </>
      )}

      {/* User management */}
      <RevealSection reduce={reduce} delay={0.1}>
        <section className="mt-16 bg-ink p-6 text-platform sm:p-8">
          <div className="flex items-end justify-between border-b border-platform/20 pb-3">
            <h2 className="font-display text-2xl uppercase tracking-board">User management</h2>
            {usersPage && (
              <span className="font-mono text-xs uppercase text-platform/50">
                {usersPage.total} total
              </span>
            )}
          </div>

          {usersQuery.isError && !usersQuery.isLoading && (
            <p className="mt-6 font-mono text-sm text-signal">
              Couldn&apos;t load users right now. Please try again shortly.
            </p>
          )}

          {usersPage && !usersQuery.isLoading && !usersQuery.isError && (
            <div className="mt-6 [&_th]:text-platform/50 [&_td]:text-platform [&_tr]:border-platform/20 [&_.text-mute]:text-platform/50 [&_.text-ink]:text-platform">
              <UserTable users={usersPage.users} />
            </div>
          )}
        </section>
      </RevealSection>
    </div>
  );
}
