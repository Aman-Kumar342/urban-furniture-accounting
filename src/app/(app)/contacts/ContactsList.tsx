"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useView } from "@/lib/useView";
import {
  CONTACT_TYPE_LABEL,
  CONTACT_TYPE_TONE,
  formatAddress,
  type Contact,
} from "@/lib/contacts";

export function ContactsList() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useView("view.contacts");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ contacts: Contact[] }>("/api/contacts");
      setContacts(res.contacts);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to contacts."
          : "Couldn't load contacts. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.phone, c.city].filter(Boolean).some((v) => v!.toLowerCase().includes(needle)),
    );
  }, [contacts, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Input
            type="search"
            placeholder="Search name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search contacts"
          />
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Link href="/contacts/new">
            <Button>New contact</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasQuery={q.trim().length > 0} query={q.trim()} />
      ) : view === "kanban" ? (
        <KanbanGrid contacts={filtered} total={contacts?.length ?? 0} filtered={!!q.trim()} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Location</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const address = formatAddress(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/contacts/${c.id}`)}
                      className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} imageUrl={c.imageUrl} size="sm" />
                          <Link
                            href={`/contacts/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-ink hover:text-pine hover:underline"
                          >
                            {c.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={CONTACT_TYPE_TONE[c.type]}>{CONTACT_TYPE_LABEL[c.type]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{c.email || <span className="text-line">—</span>}</td>
                      <td className="px-4 py-3 tnum text-muted">{c.phone || <span className="text-line">—</span>}</td>
                      <td className="hidden px-4 py-3 text-muted lg:table-cell">
                        {address || <span className="text-line">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
            {q.trim() && contacts ? ` of ${contacts.length}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanGrid({ contacts, total, filtered }: { contacts: Contact[]; total: number; filtered: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {contacts.map((c) => (
          <Link
            key={c.id}
            href={`/contacts/${c.id}`}
            className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-pine/40 hover:bg-paper/40"
          >
            <div className="flex items-start gap-3">
              <Avatar name={c.name} imageUrl={c.imageUrl} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink">{c.name}</p>
                  <Badge tone={CONTACT_TYPE_TONE[c.type]}>{CONTACT_TYPE_LABEL[c.type]}</Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{c.email || "—"}</p>
                <p className="tnum text-sm text-muted">{c.phone || "—"}</p>
                {formatAddress(c) && <p className="mt-1 truncate text-xs text-muted">{formatAddress(c)}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted">
        {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
        {filtered ? ` of ${total}` : ""}
      </p>
    </div>
  );
}

function EmptyState({ hasQuery, query }: { hasQuery: boolean; query: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
      {hasQuery ? (
        <p className="text-sm text-muted">
          No contacts match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <>
          <p className="font-display text-lg text-ink">No contacts yet</p>
          <p className="mt-1 text-sm text-muted">Add customers and vendors to use them on orders, invoices, and bills.</p>
          <Link href="/contacts/new" className="mt-5 inline-block">
            <Button>New contact</Button>
          </Link>
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="h-3 w-40 rounded bg-line/50" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0">
          <div className="h-9 w-9 rounded-full bg-line/50" />
          <div className="h-3 w-40 rounded bg-line/50" />
          <div className="ml-auto h-3 w-24 rounded bg-line/40" />
        </div>
      ))}
    </div>
  );
}
