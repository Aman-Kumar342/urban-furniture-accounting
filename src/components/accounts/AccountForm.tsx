"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { ACCOUNT_TYPES, type Account, type AccountType } from "@/lib/accounts";

type Values = { code: string; name: string; type: AccountType; parentId: string };
type Errors = Partial<Record<keyof Values, string>> & { form?: string };

function fromAccount(a?: Account): Values {
  return { code: a?.code ?? "", name: a?.name ?? "", type: a?.type ?? "ASSET", parentId: a?.parentId ?? "" };
}

export function AccountForm({ account }: { account?: Account }) {
  const router = useRouter();
  const editing = !!account;
  const [values, setValues] = useState<Values>(() => fromAccount(account));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parents, setParents] = useState<Account[]>([]);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Parent options come from the (non-archived) accounts list; exclude self when editing.
  useEffect(() => {
    let alive = true;
    apiFetch<{ accounts: Account[] }>("/api/accounts")
      .then((r) => {
        if (alive) setParents(r.accounts.filter((a) => a.id !== account?.id));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [account?.id]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setSaved(false);
  };

  function applySaveError(err: unknown) {
    if (err instanceof ApiRequestError) {
      if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
        const d = err.details as Record<string, string[] | undefined>;
        const next: Errors = {};
        (["code", "name", "type", "parentId"] as (keyof Values)[]).forEach((k) => {
          if (d[k]?.[0]) next[k] = d[k]![0];
        });
        setErrors(Object.keys(next).length ? next : { form: "Please check the highlighted fields." });
      } else if (err.code === "INVALID_PARENT") {
        setErrors({ parentId: err.message });
      } else if (err.code === "NOT_FOUND") {
        setErrors({ parentId: err.message });
      } else if (err.code === "CONFLICT") {
        if (/type/i.test(err.message)) setErrors({ type: err.message });
        else setErrors({ form: err.message });
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
    if (!editing && !values.code.trim()) next.code = "Enter an account code.";
    if (!values.name.trim()) next.name = "Enter an account name.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/accounts/${account!.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: values.name.trim(),
            type: values.type,
            parentId: values.parentId || null,
          }),
        });
        setSaved(true);
        router.refresh();
      } else {
        const res = await apiFetch<{ account: Account }>("/api/accounts", {
          method: "POST",
          body: JSON.stringify({
            code: values.code.trim(),
            name: values.name.trim(),
            type: values.type,
            parentId: values.parentId || null,
          }),
        });
        router.push(`/accounts/${res.account.id}`);
        return;
      }
    } catch (err) {
      applySaveError(err);
    } finally {
      setSaving(false);
    }
  }

  async function runAction(path: string) {
    setActioning(true);
    setActionError(null);
    try {
      await apiFetch(`/api/accounts/${account!.id}/${path}`, { method: "POST", body: "{}" });
      if (path === "archive") {
        router.push("/accounts");
      } else {
        router.refresh();
      }
      router.refresh();
    } catch (err) {
      setConfirmArchive(false);
      setActionError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setActioning(false);
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
          This account is archived. Unarchive it to use it on journals and documents again.
        </div>
      )}

      <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Code"
            htmlFor="code"
            error={errors.code}
            hint={editing ? "Code can't be changed after creation." : "A short unique code, e.g. 1010."}
          >
            <Input id="code" className="tnum" value={values.code} onChange={set("code")} invalid={!!errors.code} disabled={editing} />
          </FormField>
          <FormField label="Type" htmlFor="type" error={errors.type} hint={editing ? "Type is locked once the account has postings." : undefined}>
            <Select id="type" value={values.type} onChange={set("type")}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Account name" htmlFor="name" error={errors.name}>
              <Input id="name" autoFocus={!editing} value={values.name} onChange={set("name")} invalid={!!errors.name} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Parent account" htmlFor="parentId" error={errors.parentId} hint="Optional — nest this account under another.">
              <Select id="parentId" value={values.parentId} onChange={set("parentId")} invalid={!!errors.parentId}>
                <option value="">— None (top level) —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {editing ? "Save changes" : "Create account"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(editing ? `/accounts/${account!.id}` : "/accounts")}>
          Cancel
        </Button>
      </div>

      {editing && (
        <div className="rounded-lg border border-line bg-surface p-5">
          {actionError && (
            <div role="alert" className="mb-4 rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
              {actionError}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {account!.isArchived ? (
              <>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Unarchive account</p>
                  <p className="text-sm text-muted">Restores it to the active chart of accounts.</p>
                </div>
                <Button type="button" onClick={() => runAction("unarchive")} loading={actioning}>
                  Unarchive
                </Button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Archive account</p>
                  <p className="text-sm text-muted">
                    Hides it from lists and pickers. Blocked if it&rsquo;s a journal&rsquo;s default account or has active children. Posted history is untouched.
                  </p>
                </div>
                {confirmArchive ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" onClick={() => setConfirmArchive(false)} disabled={actioning}>
                      Cancel
                    </Button>
                    <button
                      type="button"
                      onClick={() => runAction("archive")}
                      disabled={actioning}
                      className="inline-flex h-11 items-center rounded-md bg-oxblood px-4 text-sm font-medium text-paper transition-colors hover:bg-oxblood/90 disabled:opacity-60"
                    >
                      {actioning ? "Archiving…" : "Confirm archive"}
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
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
