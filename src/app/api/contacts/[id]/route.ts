import { requireStaff } from "@/server/auth/rbac";
import { updateContactSchema } from "@/server/validation/sales";
import { getContact, updateContact } from "@/server/services/contact.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ contact: await getContact(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateContactSchema.parse(await parseJson(req));
    return ok({ contact: await updateContact(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
