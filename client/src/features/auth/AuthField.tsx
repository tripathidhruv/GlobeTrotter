import type { InputHTMLAttributes } from "react";

const inputClass =
  "w-full rounded-sm border border-rail bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit";
const labelClass = "mb-1 block font-display text-xs uppercase tracking-board text-ink";

export function AuthField({
  id,
  label,
  ...inputProps
}: { id: string; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} className={inputClass} {...inputProps} />
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-4 border-l-2 border-signal bg-white px-3 py-2 text-sm text-ink">
      {message}
    </div>
  );
}
