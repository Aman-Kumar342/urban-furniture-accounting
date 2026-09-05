"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError("Enter your email.");
    if (!EMAIL_RE.test(email.trim())) return setError("Enter a valid email address.");
    setError(undefined);
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.code === "VALIDATION" ? "Enter a valid email address." : err.message);
      } else {
        setError("Can't reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Generic confirmation shown for any valid email, so the page never reveals whether an account
  // exists. It doesn't claim an email was definitely sent.
  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-ink">
          If an account exists for <span className="font-medium">{email.trim()}</span>, you&rsquo;ll
          receive a link to reset your password.
        </p>
        <Link
          href="/login"
          className="inline-flex text-sm font-medium text-pine transition-colors hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Email" htmlFor="email" error={error}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!error}
        />
      </FormField>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Sending link…" : "Send reset link"}
      </Button>
    </form>
  );
}
