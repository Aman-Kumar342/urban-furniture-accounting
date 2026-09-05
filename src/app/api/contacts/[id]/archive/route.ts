import { requireStaff } from "@/server/auth/rbac";
import { archiveContact, unarchiveContact } from "@/server/services/contact.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { unarchive?: boolean };
    const contact = body?.unarchive ? await unarchiveContact(id) : await archiveContact(id);
    return ok({ contact });
  } catch (e) {
    return errorToResponse(e);
  }
}
