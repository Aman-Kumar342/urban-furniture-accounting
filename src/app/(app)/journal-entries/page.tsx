import { JournalEntriesList } from "./JournalEntriesList";

export const dynamic = "force-dynamic";

// Journal Entries (mockup §3). Staff-guarded by the (app) layout; data via GET /api/journal-entries.
export default function JournalEntriesPage() {
  return <JournalEntriesList />;
}
