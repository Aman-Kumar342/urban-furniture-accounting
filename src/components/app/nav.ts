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
  // The mockup's "Account" master-data group grows as each screen ships.
  {
    label: "Account",
    items: [
      { label: "Contacts", href: "/contacts" },
      { label: "Products", href: "/products" },
      { label: "Chart of Accounts", href: "/accounts" },
      { label: "Journals", href: "/journals" },
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
