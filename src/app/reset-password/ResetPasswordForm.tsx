"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { validatePassword } from "@/lib/password";

type Status = "form" | "success" | "invalid";
type Errors = { password?: string; confirm?: string; form?: string };

export function ResetPasswordForm() {
  const router = useRouter();
  // The token comes from the reset link. It's used only in the request body — never rendered or
  // logged. Captured once so we can then scrub it from the address bar/history below.
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get("token") ?? "");
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(token ? "form" : "invalid");

  // Defense in depth: once captured, remove the token from the URL so it doesn't linger in the
  // address bar, history, or a screenshot. The captured value stays in memory for the request.
  useEffect(() => {
    if (token && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/reset-password");
    }
  }, [token]);

  // On a successful reset all sessions are invalidated, so send the user to sign in fresh.
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => router.replace("/login"), 2500);
    return () => clearTimeout(t);
  }, [status, router]);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    const pwErr = validatePassword(values.password);
    if (pwErr) next.password = pwErr;
    if (values.confirm !== values.password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: values.password }),
      });
      setStatus("success");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "INVALID_RESET_TOKEN") {
          setStatus("invalid");
        } else if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
          const d = err.details as Record<string, string[] | undefined>;
          setErrors({ password: d.password?.[0] ?? "Choose a stronger password." });
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: "Can't reach the server. Check your connection and try again." });
      }
      setLoading(false);
    }
  }

  if (status === "invalid") {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-ink">
          This reset link is invalid or has expired. Reset links can only be used once and last one hour.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex text-sm font-medium text-pine transition-colors hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-income/10 text-income">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sm text-ink">Your password has been reset. Taking you to sign in&hellip;</p>
        <Link
          href="/login"
          className="inline-flex text-sm font-medium text-pine transition-colors hover:underline"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.form && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {errors.form}
        </div>
      )}

      <FormField
        label="New password"
        htmlFor="password"
        error={errors.password}
        hint="At least 9 characters, with an uppercase, a lowercase, and a special character."
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" autoFocus value={values.password} onChange={set("password")} invalid={!!errors.password} />
      </FormField>

      <FormField label="Confirm password" htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} invalid={!!errors.confirm} />
      </FormField>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
