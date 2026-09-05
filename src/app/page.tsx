export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Urban Furniture — Accounting</h1>
      <p className="mt-2 text-sm opacity-70">
        Scaffold is running. Business features are added in later phases
        (Auth &amp; RBAC, then the accounting posting service).
      </p>
      <ul className="mt-6 space-y-1 text-sm opacity-90">
        <li>• Next.js (App Router) · TypeScript · Tailwind CSS</li>
        <li>• Prisma · PostgreSQL · Zod</li>
      </ul>
      <a
        href="/api/health"
        className="mt-8 inline-block rounded-md border border-current/20 px-3 py-1.5 text-sm hover:opacity-80"
      >
        Check /api/health →
      </a>
    </main>
  );
}
