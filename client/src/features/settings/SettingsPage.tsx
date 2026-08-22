import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useProfile, useUpdateProfile, useDeleteAccount } from "./useProfile";
import { useTrips } from "../trips/useTrips";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "hi", label: "Hindi" },
];

const DELETE_PHRASE = "DELETE MY ACCOUNT";

function Reveal({
  index,
  reduce,
  children,
  className,
}: {
  index: number;
  reduce: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const inputClasses =
  "w-full rounded-sm border border-platform/25 bg-ink px-3 py-2 text-sm text-platform outline-none transition-colors focus:border-signal [color-scheme:dark]";

export function SettingsPage() {
  const { data: profile, isLoading, isError } = useProfile();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();
  const { data: trips } = useTrips();
  const reduce = useReducedMotion() ?? false;
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [languagePref, setLanguagePref] = useState("en");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setAvatarUrl(profile.avatarUrl ?? "");
    setLanguagePref(profile.languagePref);
  }, [profile]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaved(false);
    updateProfile(
      {
        name: name.trim() === "" ? null : name.trim(),
        avatarUrl: avatarUrl.trim() === "" ? null : avatarUrl.trim(),
        languagePref,
      },
      {
        onSuccess: () => setSaved(true),
        onError: () => setSaveError("Couldn't save your changes right now. Please try again."),
      }
    );
  }

  function requestDelete() {
    setDeleteError(null);
    setDeleteConfirmText("");
    setDeleteOpen(true);
  }

  function confirmDelete() {
    if (deleteConfirmText !== DELETE_PHRASE) {
      setDeleteError(`Type "${DELETE_PHRASE}" exactly to confirm.`);
      return;
    }
    setDeleteError(null);
    deleteAccount(undefined, {
      onSuccess: async () => {
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
      },
      onError: () => setDeleteError("Couldn't delete your account right now. Please try again."),
    });
  }

  const destinations =
    trips
      ?.map((trip) => trip.stops?.[0]?.city)
      .filter((city): city is { name: string; country: string; imageUrl?: string | null } => !!city) ?? [];

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-ink text-platform">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-board text-signal">Passenger profile</p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-board sm:text-6xl">
            {profile?.name || "Settings"}
          </h1>
          <p className="mt-3 font-mono text-sm text-platform/60">{profile?.email}</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-14">
        {isLoading && <p className="text-mute">Loading your profile...</p>}
        {isError && (
          <p className="text-mute">Couldn't load your profile right now. Please try again shortly.</p>
        )}

        {profile && (
          <>
            <Reveal index={0} reduce={reduce}>
              <form
                onSubmit={handleSave}
                className="rounded-sm border border-rail bg-board/40 p-6"
              >
                <h2 className="font-display text-lg uppercase tracking-board text-platform">
                  Ticket details
                </h2>

                <div className="mt-6 grid gap-5">
                  <div className="border-b border-platform/10 pb-5">
                    <label htmlFor="name" className="block font-mono text-xs uppercase text-mute">
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`mt-2 ${inputClasses}`}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="border-b border-platform/10 pb-5">
                    <label htmlFor="email" className="block font-mono text-xs uppercase text-mute">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      readOnly
                      className={`mt-2 ${inputClasses} cursor-not-allowed opacity-60`}
                    />
                    <p className="mt-2 font-mono text-[10px] uppercase text-platform/40">
                      Managed by your sign-in provider. Cannot be changed here.
                    </p>
                  </div>

                  <div className="border-b border-platform/10 pb-5">
                    <label htmlFor="avatarUrl" className="block font-mono text-xs uppercase text-mute">
                      Avatar URL
                    </label>
                    <input
                      id="avatarUrl"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className={`mt-2 ${inputClasses}`}
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>

                  <div className="pb-1">
                    <label htmlFor="languagePref" className="block font-mono text-xs uppercase text-mute">
                      Language preference
                    </label>
                    <select
                      id="languagePref"
                      value={languagePref}
                      onChange={(e) => setLanguagePref(e.target.value)}
                      className={`mt-2 ${inputClasses}`}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {saveError && (
                  <p role="alert" className="mt-4 text-sm text-signal">
                    {saveError}
                  </p>
                )}
                {saved && !saveError && (
                  <p role="status" className="mt-4 text-sm text-transit">
                    Saved.
                  </p>
                )}

                <div className="mt-6">
                  <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
                    {isSaving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </Reveal>

            <Reveal index={1} reduce={reduce} className="mt-10">
              <div className="rounded-sm border border-rail bg-board/40 p-6">
                <h2 className="font-display text-lg uppercase tracking-board text-platform">
                  Destinations visited on your trips
                </h2>
                <p className="mt-1 font-mono text-[10px] uppercase text-platform/40">
                  Derived from your trips' first stops — not a separate saved-destinations list.
                </p>
                {destinations.length === 0 ? (
                  <p className="mt-4 text-sm text-mute">No destinations yet. Plan a trip to see them here.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-platform/10">
                    {destinations.map((city, i) => (
                      <li
                        key={`${city.name}-${city.country}-${i}`}
                        className="flex items-center justify-between py-3 text-sm"
                      >
                        <span className="font-display uppercase tracking-board text-platform">
                          {city.name}
                        </span>
                        <span className="font-mono text-xs text-platform/50">{city.country}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>

            <Reveal index={2} reduce={reduce} className="mt-10">
              <div className="rounded-sm border border-signal/50 bg-ink p-6">
                <h2 className="font-display text-lg uppercase tracking-board text-signal">
                  Danger zone
                </h2>
                <p className="mt-2 text-sm text-platform/70">
                  Deleting your account permanently removes your profile and all of your trips. This
                  cannot be undone.
                </p>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={requestDelete}
                    className="border-signal text-signal hover:border-platform hover:text-platform"
                  >
                    Delete account
                  </Button>
                </div>
                {deleteError && !deleteOpen && (
                  <p role="alert" className="mt-4 text-sm text-signal">
                    {deleteError}
                  </p>
                )}
              </div>
            </Reveal>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        description={
          <div>
            <p>
              This permanently deletes your profile and all of your trips. This action cannot be
              undone. Type <span className="text-ink">{DELETE_PHRASE}</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              aria-label="Type DELETE MY ACCOUNT to confirm"
              className="mt-3 w-full rounded-sm border border-rail bg-platform px-3 py-2 text-sm text-ink outline-none focus:border-signal"
              autoFocus
            />
            {deleteError && (
              <p role="alert" className="mt-2 text-sm text-signal">
                {deleteError}
              </p>
            )}
          </div>
        }
        confirmLabel="Permanently delete"
        pendingLabel="Deleting..."
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
