import { requireStaff } from "@/server/auth/rbac";
import { createJournalSchema } from "@/server/validation/journal";
import { createJournal, listJournals } from "@/server/services/journal.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaff();
    const input = createJournalSchema.parse(await parseJson(req));
    return ok({ journal: await createJournal(input) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    await requireStaff();
    return ok({ journals: await listJournals() });
  } catch (e) {
    return errorToResponse(e);
  }
}
