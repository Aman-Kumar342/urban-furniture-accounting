// Admin navigation. Only screens that actually exist appear here; this grows one entry at a
// time as each admin screen is built, so nothing is reachable only by typing a URL and nothing
// links to a page that doesn't exist yet.
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
  // The mockup's "Account" master-data group (Contacts, Products, Chart of Accounts, Journals,
  // Analytic Accounts, Journal Entries) is added here as each screen ships.
  { label: "Admin", items: [{ label: "Create user", href: "/admin/users/new", adminOnly: true }] },
];

export function titleForPath(pathname: string): string {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === pathname) return item.label;
    }
  }
  return "Urban Furniture";
}
