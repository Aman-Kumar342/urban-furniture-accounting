"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { JOURNAL_TYPES, type Journal, type JournalType } from "@/lib/journals";
import type { Account } from "@/lib/accounts";

type Values = { name: string; type: JournalType; defaultAccountId: string };
type Errors = Partial<Record<keyof Values, string>> & { form?: string };

function fromJournal(j?: Journal): Values {
  return { name: j?.name ?? "", type: j?.type ?? "SALES", defaultAccountId: j?.defaultAccountId ?? "" };
}

export function JournalForm({ journal }: { journal?: Journal }) {
  const router = useRouter();
  const editing = !!journal;
  const [values, setValues] = useState<Values>(() => fromJournal(journal));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accounts, setAccounts] = useState<Account[] | null>(null);

  // Default-account options reuse the existing Accounts API (non-archived). We never duplicate the
  // chart of accounts here — just reference it.
  useEffect(() => {
    let alive = true;
    apiFetch<{ accounts: Account[] }>("/api/accounts")
      .then((r) => {
        if (alive) setAccounts(r.accounts);
      })
      .catch(() => {
        if (alive) setAccounts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setSaved(false);
  };

  function applyError(err: unknown) {
    if (err instanceof ApiRequestError) {
      if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
        const d = err.details as Record<string, string[] | undefined>;
        const next: Errors = {};
        (["name", "type", "defaultAccountId"] as (keyof Values)[]).forEach((k) => {
          if (d[k]?.[0]) next[k] = d[k]![0];
        });
        setErrors(Object.keys(next).length ? next : { form: "Please check the highlighted fields." });
      } else if (err.code === "CONFLICT") {
        if (/default account/i.test(err.message)) setErrors({ defaultAccountId: err.message });
        else setErrors({ name: err.message });
      } else if (err.code === "NOT_FOUND") {
        setErrors({ defaultAccountId: err.message });
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
    if (!values.name.trim()) next.name = "Enter a journal name.";
    if (!values.defaultAccountId) next.defaultAccountId = "Choose a default account.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = { name: values.name.trim(), type: values.type, defaultAccountId: values.defaultAccountId };
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/journals/${journal!.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSaved(true);
        router.refresh();
      } else {
        const res = await apiFetch<{ journal: Journal }>("/api/journals", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        router.push(`/journals/${res.journal.id}`);
        return;
      }
    } catch (err) {
      applyError(err);
    } finally {
      setSaving(false);
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

      <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
        <FormField label="Journal name" htmlFor="name" error={errors.name}>
          <Input id="name" autoFocus value={values.name} onChange={set("name")} invalid={!!errors.name} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="type" error={errors.type}>
            <Select id="type" value={values.type} onChange={set("type")}>
              {JOURNAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Default account"
            htmlFor="defaultAccountId"
            error={errors.defaultAccountId}
            hint="Used to pre-fill postings for this journal."
          >
            <Select
              id="defaultAccountId"
              value={values.defaultAccountId}
              onChange={set("defaultAccountId")}
              invalid={!!errors.defaultAccountId}
              disabled={accounts === null}
            >
              <option value="">{accounts === null ? "Loading accounts…" : "Select an account"}</option>
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {editing ? "Save changes" : "Create journal"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(editing ? `/journals/${journal!.id}` : "/journals")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
