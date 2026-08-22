import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTrip } from "./useTrips";
import { Button } from "../../components/ui/Button";

const inputClass =
  "w-full rounded-sm border border-rail bg-white px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit";

export function CreateTripPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useCreateTrip();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (name.trim().length === 0) {
      setValidationError("Trip name is required.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setValidationError("End date must be on or after the start date.");
      return;
    }
    setValidationError(null);

    try {
      const trip = await mutateAsync({
        name,
        description,
        startDate,
        endDate,
        coverPhotoUrl: coverPhotoUrl.trim() ? coverPhotoUrl.trim() : undefined,
      });
      navigate(`/trips/${trip.id}/build`);
    } catch {
      setSubmitError("Couldn't save this trip right now. Please try again.");
    }
  }

  return (
    <div>
      <div className="bg-ink px-6 py-10 text-platform">
        <div className="mx-auto max-w-xl">
          <h1 className="font-display text-3xl uppercase tracking-board">Plan a new trip</h1>
          <p className="mt-1 text-sm text-platform/60">
            Set the basics — you can add stops and activities next.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 py-10">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block font-display text-xs uppercase tracking-board text-mute">
              Trip name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start" className="mb-1 block font-display text-xs uppercase tracking-board text-mute">
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
              <label htmlFor="end" className="mb-1 block font-display text-xs uppercase tracking-board text-mute">
                End date
              </label>
              <input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="description" className="mb-1 block font-display text-xs uppercase tracking-board text-mute">
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
            <label htmlFor="coverPhotoUrl" className="mb-1 block font-display text-xs uppercase tracking-board text-mute">
              Cover photo URL
            </label>
            <input
              id="coverPhotoUrl"
              type="url"
              placeholder="Optional"
              value={coverPhotoUrl}
              onChange={(e) => setCoverPhotoUrl(e.target.value)}
              className={inputClass}
            />
          </div>

          {validationError && (
            <p role="alert" className="text-sm text-signal">
              {validationError}
            </p>
          )}
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
    </div>
  );
}
