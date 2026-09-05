import { requireStaff } from "@/server/auth/rbac";
import { createContactSchema } from "@/server/validation/sales";
import { createContact, listContacts } from "@/server/services/contact.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaff();
    const input = createContactSchema.parse(await parseJson(req));
    return ok({ contact: await createContact(input) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    await requireStaff();
    return ok({ contacts: await listContacts() });
  } catch (e) {
    return errorToResponse(e);
  }
}
