'use client';

import { useEffect, useState } from 'react';
import SessionView from './SessionView';

export default function SessionPageClient({ sessionId }: { sessionId: string }) {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/transcript`);
        const json = await res.json();
        setTranscript(json?.transcript ?? null);
      } catch (err) {
        console.error('Failed to load transcript:', err);
        setTranscript(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading transcript…</div>;
  }

  return <SessionView transcript={transcript} />;
}
