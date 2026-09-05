import { ProductsList } from "./ProductsList";

export const dynamic = "force-dynamic";

// Products master data (mockup §2.2). Staff-guarded by the (app) layout; data via GET /api/products.
export default function ProductsPage() {
  return <ProductsList />;
}
