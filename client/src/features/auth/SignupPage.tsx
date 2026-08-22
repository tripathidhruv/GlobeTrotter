import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { AuthLayout } from "./AuthLayout";

const inputClass =
  "w-full rounded-sm border border-rail bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit";
const labelClass = "mb-1 block font-display text-xs uppercase tracking-board text-ink";

export function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);
    if (error) return setError(error.message);
    navigate("/login");
  }

  return (
    <AuthLayout heading="Create an account" subheading="Start mapping your next route.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <div
            role="alert"
            className="mb-4 border-l-2 border-signal bg-white px-3 py-2 text-sm text-ink"
          >
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </Button>
        <p className="mt-4 text-center text-sm text-mute">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-transit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transit"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
