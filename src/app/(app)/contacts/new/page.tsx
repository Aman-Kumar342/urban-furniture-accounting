import Link from "next/link";
import { ContactForm } from "@/components/contacts/ContactForm";

export const dynamic = "force-dynamic";

export default function NewContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackLink />
      <ContactForm />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-pine">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Contacts
    </Link>
  );
}
