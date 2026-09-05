import { requireStaff } from "@/server/auth/rbac";
import { updateJournalSchema } from "@/server/validation/journal";
import { getJournal, updateJournal } from "@/server/services/journal.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ journal: await getJournal(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateJournalSchema.parse(await parseJson(req));
    return ok({ journal: await updateJournal(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
