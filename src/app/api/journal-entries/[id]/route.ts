import { requireStaff } from "@/server/auth/rbac";
import { getJournalEntry } from "@/server/services/journalEntry.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ entry: await getJournalEntry(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}
