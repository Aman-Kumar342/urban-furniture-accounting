import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/rbac";
import { Logo } from "@/components/brand/Logo";
import { CreateUserForm } from "./CreateUserForm";

export const dynamic = "force-dynamic";

// ADMIN-only screen. The page guard is UX; the API (POST /api/admin/users, requireRole ADMIN)
// is the real security boundary. Non-admins see a clear "admins only" panel rather than the form.
export default async function CreateUserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const isAdmin = user.role === "ADMIN";

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(33,28,24,0.035) 31px, rgba(33,28,24,0.035) 32px)",
      }}
    >
      <div className="w-full max-w-[460px]">
        <div className="rounded-xl border border-line bg-surface px-8 py-9 shadow-[0_1px_2px_rgba(33,28,24,0.05),0_10px_28px_-14px_rgba(33,28,24,0.14)]">
          <div className="flex justify-center text-pine">
            <Logo />
          </div>

          {isAdmin ? (
            <>
              <h1 className="mt-7 text-center font-display text-xl text-ink">Create user</h1>
              <p className="mt-1 text-center text-sm text-muted">
                Add a team member or a customer portal account.
              </p>
              <div className="mt-6">
                <CreateUserForm />
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-7 text-center font-display text-xl text-ink">Admins only</h1>
              <p className="mt-2 text-center text-sm text-muted">
                You&rsquo;re signed in as {user.name}. Only an administrator can create users.
              </p>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-pine">
            Back to app
          </Link>
        </p>
      </div>
    </main>
  );
}
