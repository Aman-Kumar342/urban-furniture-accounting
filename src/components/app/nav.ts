// Admin navigation. Ordered to match the mockup's information architecture
// (Sales · Purchase · Account · Budget · Reports), with an admin-only section last.
export interface NavItem {
  label: string;
  href: string;
  adminOnly?: boolean;
}

export interface NavSection {
  label: string | null;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  { label: null, items: [{ label: "Dashboard", href: "/" }] },
  {
    label: "Sales",
    items: [
      { label: "Sales Orders", href: "/sales-orders" },
      { label: "Invoices", href: "/invoices" },
    ],
  },
  {
    label: "Purchase",
    items: [
      { label: "Purchase Orders", href: "/purchase-orders" },
      { label: "Bills", href: "/bills" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Contacts", href: "/contacts" },
      { label: "Products", href: "/products" },
      { label: "Chart of Accounts", href: "/accounts" },
      { label: "Journals", href: "/journals" },
      { label: "Analytic Accounts", href: "/analytic-accounts" },
      { label: "Journal Entries", href: "/journal-entries" },
      { label: "Payments", href: "/payments" },
    ],
  },
  { label: "Budget", items: [{ label: "Budgets", href: "/budgets" }] },
  {
    label: "Reports",
    items: [
      { label: "Profit & Loss", href: "/reports/profit-loss" },
      { label: "Balance Sheet", href: "/reports/balance-sheet" },
      { label: "Budget Report", href: "/reports/budget" },
    ],
  },
  { label: "Admin", items: [{ label: "Create user", href: "/admin/users/new", adminOnly: true }] },
];

// Title for the topbar: exact match first, else the closest section item whose path is a prefix
// (so /contacts/new and /contacts/:id still read "Contacts"). "/" only matches exactly.
export function titleForPath(pathname: string): string {
  let best: NavItem | null = null;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === pathname) return item.label;
      if (item.href !== "/" && pathname.startsWith(item.href + "/")) {
        if (!best || item.href.length > best.href.length) best = item;
      }
    }
  }
  return best?.label ?? "Urban Furniture";
}
