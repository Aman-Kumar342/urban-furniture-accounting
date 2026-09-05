"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { validatePassword } from "@/lib/password";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Errors = { name?: string; email?: string; password?: string; confirm?: string; form?: string };

export function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Enter your full name.";
    if (!values.email.trim()) next.email = "Enter your email.";
    else if (!EMAIL_RE.test(values.email.trim())) next.email = "Enter a valid email address.";
    const pwErr = validatePassword(values.password);
    if (pwErr) next.password = pwErr;
    if (values.confirm !== values.password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        }),
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
          const d = err.details as Record<string, string[] | undefined>;
          setErrors({ name: d.name?.[0], email: d.email?.[0], password: d.password?.[0] });
        } else if (err.code === "EMAIL_TAKEN") {
          setErrors({ email: err.message });
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: "Can't reach the server. Check your connection and try again." });
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {errors.form && (
        <div
          role="alert"
          className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood"
        >
          {errors.form}
        </div>
      )}

      <FormField label="Full name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" autoFocus value={values.name} onChange={set("name")} invalid={!!errors.name} />
      </FormField>

      <FormField label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={set("email")} invalid={!!errors.email} />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password}
        hint="At least 9 characters, with an uppercase, a lowercase, and a special character."
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={set("password")} invalid={!!errors.password} />
      </FormField>

      <FormField label="Confirm password" htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} invalid={!!errors.confirm} />
      </FormField>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
