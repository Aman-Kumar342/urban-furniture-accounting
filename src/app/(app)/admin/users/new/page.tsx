import { getCurrentUser } from "@/server/auth/rbac";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export const dynamic = "force-dynamic";

// Create User inside the workspace shell. The (app) layout already guards staff (anon -> /login,
// CONTACT -> /portal); the ADMIN-only boundary stays enforced by the API. Here it's UX: an
// accountant sees a clear "admins only" panel instead of the form.
export default async function CreateUserPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-xl text-ink">Create user</h1>
        <p className="mt-1 text-sm text-muted">Add a team member or a customer portal account.</p>
      </div>
      {isAdmin ? (
        <CreateUserForm />
      ) : (
        <div className="rounded-lg border border-line bg-surface px-6 py-10 text-center">
          <p className="font-display text-lg text-ink">Admins only</p>
          <p className="mt-1 text-sm text-muted">
            You&rsquo;re signed in as {user?.name ?? "a staff user"}. Only an administrator can create users.
          </p>
        </div>
      )}
    </div>
  );
}
