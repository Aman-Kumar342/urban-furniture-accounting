"use client";

export type ViewMode = "list" | "kanban";

// Segmented List / Kanban switch (per the mockup's list↔kanban toggle on Contacts, Products,
// and Analytic Accounts). Controlled; the caller persists the choice.
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const btn = (active: boolean) =>
    `inline-flex h-9 w-9 items-center justify-center rounded transition-colors ${
      active ? "bg-pine text-paper" : "text-muted hover:text-ink"
    }`;
  return (
    <div className="inline-flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Choose view">
      <button type="button" aria-label="List view" aria-pressed={value === "list"} onClick={() => onChange("list")} className={btn(value === "list")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" aria-label="Kanban view" aria-pressed={value === "kanban"} onClick={() => onChange("kanban")} className={btn(value === "kanban")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
