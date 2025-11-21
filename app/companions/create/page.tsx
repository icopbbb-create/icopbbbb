// app/companions/create/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Build a Companion",
};

export default function CompanionCreatePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl bg-white rounded-2xl p-8 shadow">
        <h1 className="text-2xl font-bold mb-4">Build a New Companion</h1>

        <p className="text-sm text-gray-600 mb-6">
          This is a placeholder page for the “Build a New Companion” flow.
          Replace this with your companion creation form or component when ready.
        </p>

        <div className="grid gap-4">
          {/* Use Link for navigation instead of onClick handler in a Server Component */}
          <Link
            href="/companions/create/start"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-white font-semibold hover:opacity-95"
          >
            Start creating (demo)
          </Link>

          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
