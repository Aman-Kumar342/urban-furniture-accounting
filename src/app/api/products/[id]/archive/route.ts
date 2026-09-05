import { requireStaff } from "@/server/auth/rbac";
import { archiveProduct, unarchiveProduct } from "@/server/services/product.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { unarchive?: boolean };
    const product = body?.unarchive ? await unarchiveProduct(id) : await archiveProduct(id);
    return ok({ product });
  } catch (e) {
    return errorToResponse(e);
  }
}
