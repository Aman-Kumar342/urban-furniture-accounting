import { requireStaff } from "@/server/auth/rbac";
import { updateProductSchema } from "@/server/validation/sales";
import { getProduct, updateProduct } from "@/server/services/product.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ product: await getProduct(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateProductSchema.parse(await parseJson(req));
    return ok({ product: await updateProduct(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
