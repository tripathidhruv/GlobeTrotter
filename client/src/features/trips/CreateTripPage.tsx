import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTrip } from "./useTrips";
import { Button } from "../../components/ui/Button";
import { FeatureReel, type ReelItem } from "../../components/ui/FeatureReel";
import { useCities } from "../cities/useCities";

// Deliberately distinct from the dashboard hero's reel.
const INSPIRATION_CLIPS = [
  { src: "/video/istanbul.mp4", label: "Istanbul" },
  { src: "/video/marrakesh.mp4", label: "Marrakesh" },
  { src: "/video/reykjavik.mp4", label: "Reykjavik" },
  { src: "/video/kyoto.mp4", label: "Kyoto" },
];

const inputClass =
  "w-full rounded-sm border border-platform/25 bg-ink px-3 py-2.5 text-platform outline-none transition-colors placeholder:text-platform/30 focus:border-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal [color-scheme:dark]";

interface FieldErrors {
  name?: string;
  endDate?: string;
  coverPhotoUrl?: string;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function CreateTripPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useCreateTrip();
  const navigate = useNavigate();
  const { data: cities } = useCities();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const errors: FieldErrors = {};
    const trimmedCoverPhotoUrl = coverPhotoUrl.trim();

    if (name.trim().length === 0) {
      errors.name = "Trip name is required.";
    }
    if (startDate && endDate && endDate < startDate) {
      errors.endDate = "End date must be on or after the start date.";
    }
    if (trimmedCoverPhotoUrl && !isValidHttpUrl(trimmedCoverPhotoUrl)) {
      errors.coverPhotoUrl = "Enter a valid image URL starting with http:// or https://.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const trip = await mutateAsync({
        name,
        description,
        startDate,
        endDate,
        coverPhotoUrl: trimmedCoverPhotoUrl ? trimmedCoverPhotoUrl : undefined,
      });
      navigate(`/trips/${trip.id}/build`);
    } catch {
      setSubmitError("Couldn't save this trip right now. Please try again.");
    }
  }

  const reelItems: ReelItem[] = INSPIRATION_CLIPS.map((clip) => {
    const city = cities?.find((c) => c.name === clip.label);
    return {
      src: clip.src,
      label: clip.label,
      meta: city ? `${city.country} · COST ${city.costIndex}` : undefined,
      poster: city?.imageUrl ?? undefined,
    };
  });

  return (
    <div className="min-h-screen bg-ink text-platform">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1fr_0.8fr] lg:gap-16 lg:py-24">
        <div>
          <p className="font-mono text-xs uppercase tracking-board text-signal">New service</p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-board sm:text-6xl">
            Plan a new trip
          </h1>
          <p className="mt-4 max-w-md text-platform/60">
            Set the basics — you can add stops and activities next.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-10 space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block font-display text-xs uppercase tracking-board text-platform/50">
              Trip name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
            />
            {fieldErrors.name && (
              <p id="name-error" role="alert" className="mt-1 text-sm text-signal">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="mb-1.5 block font-display text-xs uppercase tracking-board text-platform/50">
                Start date
              </label>
              <input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="end" className="mb-1.5 block font-display text-xs uppercase tracking-board text-platform/50">
                End date
              </label>
              <input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputClass} font-mono`}
                aria-invalid={!!fieldErrors.endDate}
                aria-describedby={fieldErrors.endDate ? "end-error" : undefined}
              />
              {fieldErrors.endDate && (
                <p id="end-error" role="alert" className="mt-1 text-sm text-signal">
                  {fieldErrors.endDate}
                </p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="description" className="mb-1.5 block font-display text-xs uppercase tracking-board text-platform/50">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="coverPhotoUrl" className="mb-1.5 block font-display text-xs uppercase tracking-board text-platform/50">
              Cover photo URL
            </label>
            <input
              id="coverPhotoUrl"
              type="url"
              placeholder="Optional"
              value={coverPhotoUrl}
              onChange={(e) => setCoverPhotoUrl(e.target.value)}
              className={inputClass}
              aria-invalid={!!fieldErrors.coverPhotoUrl}
              aria-describedby={fieldErrors.coverPhotoUrl ? "coverPhotoUrl-error" : undefined}
            />
            {fieldErrors.coverPhotoUrl && (
              <p id="coverPhotoUrl-error" role="alert" className="mt-1 text-sm text-signal">
                {fieldErrors.coverPhotoUrl}
              </p>
            )}
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-signal">
              {submitError}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            Save trip
          </Button>
          </form>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <FeatureReel items={reelItems} />
          <p className="mt-4 font-mono text-[11px] uppercase text-platform/40">
            {(cities?.length ?? 0) > 0
              ? `${cities?.length} destinations in the catalogue`
              : "Loading destinations…"}
          </p>
        </div>
      </div>
    </div>
  );
}
