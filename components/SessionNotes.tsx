'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type NotesAPIResult = {
  ok?: boolean;
  notes?: string | null;
  feedback?: string | null;
  transcript?: string | null;
  generated_at?: string | null;
  message?: string;
};

export default function SessionNotes({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const router = useRouter();

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/notes`, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Failed to fetch notes (${res.status})`);
      }
      const json: NotesAPIResult = await res.json();
      setNotes(json.notes ?? null);
      setFeedback(json.feedback ?? null);
      setGeneratedAt(json.generated_at ?? null);
      if (json.transcript) setTranscript(json.transcript);
      return json;
    } catch (err: any) {
      setError(String(err?.message ?? err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generate notes (POST)
  const generateNotes = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/notes`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const txt = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(txt || `Regenerate failed (${res.status})`);
      }
      const json: NotesAPIResult = txt ? JSON.parse(txt) : {};
      setNotes(json.notes ?? null);
      setFeedback(json.feedback ?? null);
      setGeneratedAt(json.generated_at ?? new Date().toISOString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return json;
    } catch (err: any) {
      setError(String(err?.message ?? err));
      return null;
    } finally {
      setRegenerating(false);
      setAutoGenerating(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const json = await fetchNotes();
      if (mounted && (!json || (!json.notes && !json.feedback))) {
        setAutoGenerating(true);
        await generateNotes();
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const doRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    await generateNotes();
  };

  const downloadNotes = async () => {
    // Charge 5 credits BEFORE allowing download
    try {
      const chargeRes = await fetch('/api/credits/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5,
          action: 'download_notes',
          note: `download notes for session ${sessionId}`,
          sessionId,
        }),
      });
      const chargeJson = await chargeRes.json().catch(() => ({}));
      if (!chargeRes.ok || chargeJson?.success === false) {
        const msg = chargeJson?.error ?? 'Unable to charge credits for download';
        if (chargeJson?.blocked) {
          // redirect to upgrade
          router.push('/subscription/pro');
          return;
        }
        setError(msg);
        return;
      }

      // proceed to create file and download
      const txt = `${notes ?? 'No notes available.'}\n\nFeedback:\n${feedback ?? 'None'}\n\nGenerated: ${generatedAt ?? '-'}`;
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${sessionId}_notes.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    }
  };

  const openTranscript = () => {
    window.open(`/sessions/${sessionId}/transcript`, '_blank');
  };

  const makeBullets = (text: string | null) => {
    if (!text) return [];
    const paraSplit = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (paraSplit.length >= 3) {
      const bullets: string[] = [];
      for (const p of paraSplit) {
        const sents = p.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
        if (sents.length) bullets.push(sents[0]);
        if (bullets.length >= 6) break;
      }
      return bullets.length ? bullets : paraSplit.slice(0, 6);
    }
    const sents = text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
    return sents.slice(0, Math.min(6, Math.max(3, sents.length)));
  };

  const bullets = makeBullets(notes);

  return (
    <div className="bg-white rounded-2xl p-8 shadow max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Session Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated summary, actions & feedback</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openTranscript}
            size="sm"
            className="
            border border-orange-300 
            text-orange-700 
            bg-orange-50 
            hover:bg-orange-100 
            hover:shadow 
            hover:scale-[1.02] 
            transition-all 
            font-medium
            "
          >
            View Transcript
          </Button>

          <Button onClick={downloadNotes} size="sm" className="bg-white border">
            Download
          </Button>

          <Button
            onClick={doRegenerate}
            size="sm"
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow hover:scale-[1.02] transition-transform"
            disabled={regenerating || autoGenerating}
          >
            {regenerating || autoGenerating ? 'Generating…' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading notes…</div>
      ) : error ? (
        <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
      ) : (
        <>
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Summary</h2>

            {bullets.length > 0 ? (
              <ul className="space-y-3">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-2xl leading-none">{['🟢','✨','📌','🔎','✅','📝'][i % 6]}</span>
                    <div className="text-gray-800">{b}</div>
                  </li>
                ))}
              </ul>
            ) : notes ? (
              <div className="prose max-w-none text-gray-800">
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {notes.split('\n\n').map((p, i) => (
                    <p key={i} className="mb-3">{(i===0 ? '🟢 ' : '') + p.trim()}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-600">No AI summary available for this session.</div>
            )}
          </section>

          <section className="mb-6">
            <h3 className="text-md font-semibold mb-2">Feedback / Actions</h3>
            {feedback ? (
              <div className="text-gray-800">
                {feedback.includes('\n') ? (
                  <ul className="list-disc pl-6 space-y-1">
                    {feedback.split('\n').map((line, idx) => line.trim() && <li key={idx}>{line.trim()}</li>)}
                  </ul>
                ) : (
                  <p>{feedback}</p>
                )}
              </div>
            ) : (
              <div className="text-gray-600">No feedback available.</div>
            )}
          </section>

          {generatedAt && (
            <div className="text-xs text-muted-foreground mt-4">Generated: {new Date(generatedAt).toLocaleString()}</div>
          )}

          <div className="mt-6 flex gap-3">
            <Link href="/" className="text-sm underline">← Back to Home</Link>
            <button
              onClick={() => router.refresh()}
              className="text-sm text-muted-foreground underline"
            >
              Refresh Data
            </button>
          </div>
        </>
      )}
    </div>
  );
}
