//app/sessions/[id]/transcript/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type APIResponse =
  | { transcript: string | null }
  | { message: string }
  | string
  | null;

export default function SessionTranscriptPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<APIResponse>(null);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------
     FETCH TRANSCRIPT
  --------------------------- */
  useEffect(() => {
    if (!sessionId) {
      setError('Missing session id');
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/sessions/${sessionId}/transcript`, {
          method: 'GET',
          headers: { Accept: 'application/json, text/plain' },
          signal: controller.signal,
        });

        if (!res.ok) {
          const ct = res.headers.get('content-type') || '';
          const body =
            ct.includes('application/json')
              ? await res.json().catch(() => null)
              : await res.text().catch(() => null);

          setError(body?.message ?? body ?? `Error ${res.status}`);
          return;
        }

        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          setPayload(await res.json());
        } else {
          setPayload(await res.text());
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message ?? 'Failed to load transcript');
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [sessionId]);

  /* --------------------------
      DOWNLOAD
  --------------------------- */
  const download = async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/transcript`);
      if (!res.ok) {
        alert('Transcript unavailable for download.');
        return;
      }

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        downloadFile(
          typeof json.transcript === 'string'
            ? json.transcript
            : JSON.stringify(json, null, 2),
          `transcript_${sessionId}.txt`
        );
      } else {
        const text = await res.text();
        downloadFile(text, `transcript_${sessionId}.txt`);
      }
    } catch (err: any) {
      alert(err?.message ?? 'Download failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Transcript</h1>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          <Button onClick={download}>Download</Button>
        </div>
      </div>

      <div className="bg-white border rounded p-4 min-h-[220px]">
        {loading && <div className="text-gray-500">Loading transcript…</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && !payload && (
          <div className="text-gray-500 italic">
            No transcript available for this session.
          </div>
        )}

        {!loading && !error && payload && (
          <div className="space-y-3">{renderTranscript(payload)}</div>
        )}
      </div>
    </div>
  );
}

/* --------------------------
   RENDER LOGIC
--------------------------- */

function renderTranscript(payload: APIResponse) {
  if (!payload) return null;

  // case 1: raw string payload
  if (typeof payload === 'string') {
    return formatStringTranscript(payload);
  }

  // case 2: { transcript: "..." }
  if (typeof payload === 'object' && typeof payload.transcript === 'string') {
    return formatStringTranscript(payload.transcript);
  }

  // case 3: JSON array support (future-proof)
  if (Array.isArray(payload?.transcript)) {
    return payload.transcript.map((msg: any, i: number) => (
      <ChatBubble
        key={i}
        speaker={msg.role === 'assistant' ? 'Tutor' : 'You'}
        text={msg.content ?? msg.text ?? ''}
        time={msg.time ?? msg.created_at}
      />
    ));
  }

  // fallback JSON debugging
  return (
    <pre className="text-xs whitespace-pre-wrap">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

/* --------------------------
   FORMAT STRING TRANSCRIPT
--------------------------- */
function formatStringTranscript(text: string) {
  const lines = text.split('\n').filter(Boolean);

  return lines.map((line, i) => {
    const isAI = /^ *(assistant|tutor)/i.test(line);
    const clean = line.replace(/^(assistant|tutor|user|you):\s*/i, '');

    return (
      <ChatBubble key={i} speaker={isAI ? 'Tutor' : 'You'} text={clean} />
    );
  });
}

/* --------------------------
   CHAT BUBBLE COMPONENT
--------------------------- */
function ChatBubble({
  speaker,
  text,
  time,
}: {
  speaker: string;
  text: string;
  time?: string;
}) {
  const isUser = speaker.toLowerCase() === 'you';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] p-3 rounded-lg shadow-sm ${
          isUser
            ? 'bg-orange-50 text-orange-900'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="text-xs text-gray-500 mb-1 font-semibold">
          {speaker}
        </div>

        <div className="whitespace-pre-wrap leading-5">{text}</div>

        {time && (
          <div className="text-[11px] text-gray-400 mt-2">
            {new Date(time).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------
   DOWNLOAD HELPER
--------------------------- */
function downloadFile(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  a.remove();
  URL.revokeObjectURL(url);
}
