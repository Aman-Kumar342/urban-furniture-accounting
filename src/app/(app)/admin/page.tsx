import { redirect } from "next/navigation";

// There is no admin dashboard — the one admin screen is Create User. Send /admin there so the
// bare path doesn't 404. The (app) layout still guards staff; the API stays admin-only.
export default function AdminIndex() {
  redirect("/admin/users/new");
}
