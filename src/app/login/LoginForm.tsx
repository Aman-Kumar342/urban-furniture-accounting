"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginForm() {
  const router = useRouter();
  // "Login ID" is the account email (the backend authenticates by email).
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ loginId?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!loginId.trim()) next.loginId = "Enter your Login ID.";
    else if (!EMAIL_RE.test(loginId.trim())) next.loginId = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (next.loginId || next.password) return;

    setLoading(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginId.trim(), password }),
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      let message = "Can't reach the server. Check your connection and try again.";
      if (err instanceof ApiRequestError) {
        message =
          err.code === "INVALID_CREDENTIALS" ? "Invalid Login ID or password." : err.message;
      }
      setErrors({ form: message });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.form && (
        <div
          role="alert"
          className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood"
        >
          {errors.form}
        </div>
      )}

      <FormField label="Login ID" htmlFor="loginId" error={errors.loginId}>
        <Input
          id="loginId"
          name="loginId"
          type="email"
          autoComplete="username"
          autoFocus
          placeholder="you@urbanfurniture.test"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          invalid={!!errors.loginId}
          aria-describedby={errors.loginId ? "loginId-error" : undefined}
        />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
      </FormField>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
