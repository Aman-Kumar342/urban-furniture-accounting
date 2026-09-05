import { ContactsList } from "./ContactsList";

export const dynamic = "force-dynamic";

// Contacts master data (mockup §2.1). Staff-guarded by the (app) layout; data via GET /api/contacts.
export default function ContactsPage() {
  return <ContactsList />;
}
