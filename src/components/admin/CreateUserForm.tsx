"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { validatePassword } from "@/lib/password";

// Mockup role labels -> internal roles. Administrator = ADMIN (no separate ADMINISTRATOR role);
// Accountant = ACCOUNTANT; User = CONTACT (a customer portal account).
const ROLES = [
  { value: "ADMIN", label: "Administrator" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "CONTACT", label: "User" },
] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const roleLabel = (value: string) => ROLES.find((r) => r.value === value)?.label ?? value;

type Errors = { name?: string; email?: string; role?: string; password?: string; confirm?: string; form?: string };
const EMPTY = { name: "", email: "", role: "", password: "", confirm: "" };

export function CreateUserForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ name: string; role: string } | null>(null);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCreated(null);
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Enter a full name.";
    if (!values.email.trim()) next.email = "Enter an email.";
    else if (!EMAIL_RE.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!values.role) next.role = "Choose a role.";
    const pwErr = validatePassword(values.password);
    if (pwErr) next.password = pwErr;
    if (values.confirm !== values.password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const res = await apiFetch<{ user: { name: string; role: string } }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          role: values.role,
          password: values.password,
        }),
      });
      setCreated({ name: res.user.name, role: res.user.role });
      setValues(EMPTY);
      setErrors({});
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
          const d = err.details as Record<string, string[] | undefined>;
          setErrors({ name: d.name?.[0], email: d.email?.[0], role: d.role?.[0], password: d.password?.[0] });
        } else if (err.code === "EMAIL_TAKEN") {
          setErrors({ email: err.message });
        } else if (err.code === "FORBIDDEN" || err.code === "UNAUTHENTICATED") {
          setErrors({ form: "Your session doesn't have admin access. Sign in as an administrator and try again." });
        } else {
          setErrors({ form: err.message });
        }
      } else {
        setErrors({ form: "Can't reach the server. Check your connection and try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {created && (
        <div
          role="status"
          className="rounded-md border-l-2 border-income bg-income/5 px-3 py-2 text-sm text-income"
        >
          Created <strong className="font-semibold">{created.name}</strong> as {roleLabel(created.role)}. They can now sign in.
        </div>
      )}
      {errors.form && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {errors.form}
        </div>
      )}

      <FormField label="Full name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" autoComplete="off" autoFocus value={values.name} onChange={set("name")} invalid={!!errors.name} />
      </FormField>

      <FormField label="Email (Login ID)" htmlFor="email" error={errors.email} hint="This email is the person's Login ID.">
        <Input id="email" name="email" type="email" autoComplete="off" placeholder="name@example.com" value={values.email} onChange={set("email")} invalid={!!errors.email} />
      </FormField>

      <FormField label="Role" htmlFor="role" error={errors.role}>
        <Select id="role" name="role" value={values.role} onChange={set("role")} invalid={!!errors.role}>
          <option value="" disabled>
            Select a role
          </option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password}
        hint="At least 9 characters, with an uppercase, a lowercase, and a special character."
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={set("password")} invalid={!!errors.password} />
      </FormField>

      <FormField label="Re-enter password" htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} invalid={!!errors.confirm} />
      </FormField>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Creating user…" : "Create user"}
      </Button>
    </form>
  );
}
