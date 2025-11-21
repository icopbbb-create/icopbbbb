'use client';
import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '@/app/my-journey/my-journey.module.css';

export default function SessionCard({
  sessionId,
  title,
  updatedAt,
  image,
  showDownload = true,
}: {
  sessionId: string;
  title?: string | null;
  updatedAt?: string | null;
  image?: string | null;
  showDownload?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const displayTitle = title ?? `Session ${sessionId.slice(0, 8)}`;

  const goToNotesPage = useCallback(() => {
    router.push(`/sessions/${sessionId}/notes?openSummary=1`);
  }, [router, sessionId]);

  const downloadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/notes?format=pdf`);
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edu-voice-session-${sessionId.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      if (res.ok) {
        const json = await res.json();
        const txt = json?.ai_notes ?? json?.notes ?? json?.text ?? null;
        if (typeof txt === 'string') {
          const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `edu-voice-session-${sessionId.slice(0, 8)}-notes.txt`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return;
        }
      }

      const tRes = await fetch(`/api/sessions/${sessionId}/transcript`);
      if (tRes.ok) {
        const txt = await tRes.text();
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edu-voice-session-${sessionId.slice(0, 8)}-transcript.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      alert('No notes/transcript available for download.');
    } catch (err: any) {
      console.error('Download error', err);
      alert(err?.message ?? 'Download failed');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const deterministicDate = updatedAt ? new Date(updatedAt).toLocaleString() : null;

  const Avatar = () => {
    if (image) {
      return (
        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
          <Image src={image} alt={displayTitle} width={48} height={48} style={{ objectFit: 'cover' }} />
        </div>
      );
    }

    const initial = String(displayTitle || sessionId)[0]?.toUpperCase() ?? '?';
    return (
      <div className="w-12 h-12 rounded-md flex items-center justify-center bg-gray-100 text-gray-700 font-semibold border border-gray-200 flex-shrink-0">
        {initial}
      </div>
    );
  };

  return (
    <div className={styles.sessionCard} data-session-id={sessionId}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
        <Avatar />
        <div style={{ minWidth: 0 }}>
          <div className={styles.sessionTitle}>{displayTitle}</div>
          {deterministicDate && <div className={styles.sessionDate}>{deterministicDate}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {showDownload && (
          <button
            className={styles.orangeSmall}
            onClick={downloadNotes}
            disabled={loading}
            aria-label={`Download notes for ${displayTitle}`}
          >
            {loading ? 'Preparing…' : 'Download Notes'}
          </button>
        )}

        <button
          className={styles.outlineBtn}
          onClick={goToNotesPage}
          aria-label={`Open notes for ${displayTitle}`}
        >
          Take me there
        </button>
      </div>
    </div>
  );
}
