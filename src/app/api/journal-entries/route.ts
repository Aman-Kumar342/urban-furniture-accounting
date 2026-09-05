import { requireStaff } from "@/server/auth/rbac";
import { createManualJournalEntrySchema } from "@/server/validation/journalEntry";
import { createManualJournalEntry, listJournalEntries } from "@/server/services/journalEntry.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

// Manual journal entry. The route only authorizes, validates, and delegates — all
// accounting happens in postEntry() via the service.
export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    const input = createManualJournalEntrySchema.parse(await parseJson(req));
    return ok({ entry: await createManualJournalEntry(input, user.id) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    await requireStaff();
    return ok({ entries: await listJournalEntries() });
  } catch (e) {
    return errorToResponse(e);
  }
}
