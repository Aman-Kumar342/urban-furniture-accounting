import { requireStaff } from "@/server/auth/rbac";
import { createProductSchema } from "@/server/validation/sales";
import { createProduct, listProducts } from "@/server/services/product.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaff();
    const input = createProductSchema.parse(await parseJson(req));
    return ok({ product: await createProduct(input) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    await requireStaff();
    return ok({ products: await listProducts() });
  } catch (e) {
    return errorToResponse(e);
  }
}
