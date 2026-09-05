"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Avatar } from "@/components/ui/Avatar";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { CONTACT_TYPES, type Contact, type ContactType } from "@/lib/contacts";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const OPTIONAL_KEYS = ["email", "phone", "street", "city", "state", "country", "pincode"] as const;

type Values = {
  name: string;
  type: ContactType;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};
type Errors = Partial<Record<keyof Values, string>> & { form?: string };

function fromContact(c?: Contact): Values {
  return {
    name: c?.name ?? "",
    type: c?.type ?? "CUSTOMER",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    street: c?.street ?? "",
    city: c?.city ?? "",
    state: c?.state ?? "",
    country: c?.country ?? "",
    pincode: c?.pincode ?? "",
  };
}

export function ContactForm({ contact }: { contact?: Contact }) {
  const router = useRouter();
  const editing = !!contact;
  const [values, setValues] = useState<Values>(() => fromContact(contact));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const set =
    (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [k]: e.target.value }));
      setSaved(false);
    };

  function applyError(err: unknown) {
    if (err instanceof ApiRequestError) {
      if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
        const d = err.details as Record<string, string[] | undefined>;
        const next: Errors = {};
        for (const k of ["name", ...OPTIONAL_KEYS] as (keyof Values)[]) {
          if (d[k]?.[0]) next[k] = d[k]![0];
        }
        setErrors(Object.keys(next).length ? next : { form: "Please check the highlighted fields." });
      } else if (err.code === "CONFLICT") {
        setErrors({ email: err.message });
      } else if (err.code === "FORBIDDEN") {
        setErrors({ form: "You don't have permission to do that." });
      } else {
        setErrors({ form: err.message });
      }
    } else {
      setErrors({ form: "Can't reach the server. Check your connection and try again." });
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Enter a contact name.";
    if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload: Record<string, string> = { name: values.name.trim(), type: values.type };
    for (const k of OPTIONAL_KEYS) {
      const v = values[k].trim();
      if (v) payload[k] = v;
    }

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/contacts/${contact!.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSaved(true);
        router.refresh();
      } else {
        const res = await apiFetch<{ contact: Contact }>("/api/contacts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        router.push(`/contacts/${res.contact.id}`);
        return;
      }
    } catch (err) {
      applyError(err);
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    setArchiving(true);
    try {
      await apiFetch(`/api/contacts/${contact!.id}/archive`, { method: "POST", body: "{}" });
      router.push("/contacts");
      router.refresh();
    } catch (err) {
      setConfirmArchive(false);
      applyError(err);
      setArchiving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {errors.form && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {errors.form}
        </div>
      )}
      {saved && (
        <div role="status" className="rounded-md border-l-2 border-income bg-income/5 px-3 py-2 text-sm text-income">
          Changes saved.
        </div>
      )}

      <div className="space-y-6 rounded-lg border border-line bg-surface p-6">
        <div className="flex items-center gap-3">
          <Avatar name={values.name || "?"} imageUrl={contact?.imageUrl} size="lg" />
          <div className="min-w-0">
            <p className="font-display text-lg text-ink">{values.name.trim() || "New contact"}</p>
            <p className="text-xs text-muted">Profile image is shown as initials.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Name" htmlFor="name" error={errors.name}>
              <Input id="name" autoFocus value={values.name} onChange={set("name")} invalid={!!errors.name} />
            </FormField>
          </div>
          <FormField label="Type" htmlFor="type" error={errors.type}>
            <Select id="type" value={values.type} onChange={set("type")}>
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" placeholder="name@example.com" value={values.email} onChange={set("email")} invalid={!!errors.email} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={errors.phone}>
            <Input id="phone" inputMode="tel" value={values.phone} onChange={set("phone")} invalid={!!errors.phone} />
          </FormField>
        </div>

        <div className="border-t border-line pt-5">
          <p className="mb-4 text-sm font-medium text-ink">Address</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Street" htmlFor="street" error={errors.street}>
                <Input id="street" value={values.street} onChange={set("street")} invalid={!!errors.street} />
              </FormField>
            </div>
            <FormField label="City" htmlFor="city" error={errors.city}>
              <Input id="city" value={values.city} onChange={set("city")} invalid={!!errors.city} />
            </FormField>
            <FormField label="State" htmlFor="state" error={errors.state}>
              <Input id="state" value={values.state} onChange={set("state")} invalid={!!errors.state} />
            </FormField>
            <FormField label="Country" htmlFor="country" error={errors.country}>
              <Input id="country" value={values.country} onChange={set("country")} invalid={!!errors.country} />
            </FormField>
            <FormField label="Pincode" htmlFor="pincode" error={errors.pincode}>
              <Input id="pincode" inputMode="numeric" value={values.pincode} onChange={set("pincode")} invalid={!!errors.pincode} />
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {editing ? "Save changes" : "Create contact"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(editing ? `/contacts/${contact!.id}` : "/contacts")}
        >
          Cancel
        </Button>
      </div>

      {editing && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Archive contact</p>
              <p className="text-sm text-muted">
                Hides it from lists and pickers. Existing invoices, bills, and payments keep their link.
              </p>
            </div>
            {confirmArchive ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setConfirmArchive(false)} disabled={archiving}>
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={archive}
                  disabled={archiving}
                  className="inline-flex h-11 items-center rounded-md bg-oxblood px-4 text-sm font-medium text-paper transition-colors hover:bg-oxblood/90 disabled:opacity-60"
                >
                  {archiving ? "Archiving…" : "Confirm archive"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className="inline-flex h-11 items-center rounded-md border border-oxblood/40 px-4 text-sm font-medium text-oxblood transition-colors hover:bg-oxblood/5"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
