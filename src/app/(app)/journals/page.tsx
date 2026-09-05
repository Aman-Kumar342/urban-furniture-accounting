import { JournalsList } from "./JournalsList";

export const dynamic = "force-dynamic";

// Journals (mockup §2.4). Staff-guarded by the (app) layout; data via GET /api/journals.
export default function JournalsPage() {
  return <JournalsList />;
}
