"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { ANALYTIC_TYPES, type AnalyticAccount, type AnalyticType } from "@/lib/analyticAccounts";

type Values = { name: string; type: AnalyticType };
type Errors = Partial<Record<keyof Values, string>> & { form?: string };

function fromAccount(a?: AnalyticAccount): Values {
  return { name: a?.name ?? "", type: a?.type ?? "EXPENSE" };
}

export function AnalyticAccountForm({ account }: { account?: AnalyticAccount }) {
  const router = useRouter();
  const editing = !!account;
  const [values, setValues] = useState<Values>(() => fromAccount(account));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setSaved(false);
  };

  function applyError(err: unknown) {
    if (err instanceof ApiRequestError) {
      if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
        const d = err.details as Record<string, string[] | undefined>;
        const next: Errors = {};
        if (d.name?.[0]) next.name = d.name[0];
        if (d.type?.[0]) next.type = d.type[0];
        setErrors(Object.keys(next).length ? next : { form: "Please check the highlighted fields." });
      } else if (err.code === "CONFLICT") {
        setErrors({ name: err.message });
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
    if (!values.name.trim()) next.name = "Enter an analytic account name.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = { name: values.name.trim(), type: values.type };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/analytic-accounts/${account!.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSaved(true);
        router.refresh();
      } else {
        const res = await apiFetch<{ analyticAccount: AnalyticAccount }>("/api/analytic-accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        router.push(`/analytic-accounts/${res.analyticAccount.id}`);
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
      await apiFetch(`/api/analytic-accounts/${account!.id}/archive`, { method: "POST", body: "{}" });
      router.push("/analytic-accounts");
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
      {editing && account!.isArchived && (
        <div className="rounded-md border-l-2 border-amber bg-amber/10 px-3 py-2 text-sm text-amber">
          This analytic account is archived and won&rsquo;t appear in document or budget pickers.
        </div>
      )}

      <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
        <FormField label="Name" htmlFor="name" error={errors.name} hint="e.g. Furniture, Project 1.">
          <Input id="name" autoFocus value={values.name} onChange={set("name")} invalid={!!errors.name} />
        </FormField>
        <FormField label="Type" htmlFor="type" error={errors.type}>
          <Select id="type" value={values.type} onChange={set("type")}>
            {ANALYTIC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {editing ? "Save changes" : "Create analytic account"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(editing ? `/analytic-accounts/${account!.id}` : "/analytic-accounts")}
        >
          Cancel
        </Button>
      </div>

      {editing && !account!.isArchived && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Archive analytic account</p>
              <p className="text-sm text-muted">
                Hides it from document and budget pickers. Existing budgets, journal items, and documents keep their link.
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
