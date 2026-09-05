import type { BadgeTone } from "@/components/ui/Badge";

export type ContactType = "CUSTOMER" | "VENDOR" | "BOTH";

// Mirrors the Contact model fields returned by the API (dates serialize as ISO strings).
export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  imageUrl: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "VENDOR", label: "Vendor" },
  { value: "BOTH", label: "Both" },
];

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  CUSTOMER: "Customer",
  VENDOR: "Vendor",
  BOTH: "Both",
};

export const CONTACT_TYPE_TONE: Record<ContactType, BadgeTone> = {
  CUSTOMER: "pine",
  VENDOR: "walnut",
  BOTH: "neutral",
};

// One-line address from the parts the API stores, skipping blanks.
export function formatAddress(c: Contact): string {
  return [c.street, c.city, c.state, c.pincode, c.country].map((p) => p?.trim()).filter(Boolean).join(", ");
}
