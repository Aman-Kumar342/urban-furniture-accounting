import { PaymentsList } from "./PaymentsList";

export const dynamic = "force-dynamic";

// Payments register (mockup §4.5). Staff-guarded by the (app) layout; data via GET /api/payments.
export default function PaymentsPage() {
  return <PaymentsList />;
}
