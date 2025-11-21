// app/sessions/[id]/notes/page.tsx
import SessionNotesClientWrapper from "@/components/SessionNotesClientWrapper";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: { id: string }; searchParams?: Record<string, string | string[]> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Session notes ${params.id}` };
}

export default async function NotesPage({ params }: Props) {
  const { id } = params;
  if (!id) return notFound();

  // We intentionally don't fetch everything server-side here — the client wrapper
  // will call the API to fetch live data and provide regenerate/download UI.
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl">
        {/* client wrapper will fetch notes/transcript and show interactive controls */}
        <SessionNotesClientWrapper sessionId={id} />
      </div>
    </main>
  );
}
