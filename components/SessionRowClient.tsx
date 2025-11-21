// components/SessionRowClient.tsx
"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Session = {
  id?: string | null;
  name?: string | null;
  title?: string | null;
  display_name?: string | null;
  subject?: string | null;
  topic?: string | null;
  companion_image_url?: string | null;
  companions?: any | null;
  created_at?: string | null;
  duration_minutes?: number | null;
  duration_seconds?: number | null;
  createdAtFormatted?: string | null;
  companionId?: string | null;
  metadata?: any | null;
  deleted_at?: string | null;
  [k: string]: any;
};

export default function SessionRowClient({ session }: { session: Session }) {
  const router = useRouter();
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);

  const sessionId = session?.id ?? null;
  const companionIdFromProps = session?.companionId ?? session?.companion_id ?? null;

  const findCompanionIdFromDOM = (): string | null => {
    try {
      const el = document?.activeElement as HTMLElement | null;
      let node = el;
      while (node) {
        const cid = node.getAttribute?.("data-companion-id");
        if (cid) return cid;
        node = node.parentElement;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  const getDurationText = () => {
    const dm = session.duration_minutes;
    const ds = session.duration_seconds;
    const draw = (session as any).duration ?? null;

    if (typeof dm === "number" && !Number.isNaN(dm)) {
      return `${Math.round(dm)} mins`;
    }
    if (typeof ds === "number" && !Number.isNaN(ds)) {
      const mins = Math.round(ds / 60);
      return `${mins} mins`;
    }
    if (typeof draw === "number" && !Number.isNaN(draw)) {
      return `${Math.round(draw)} mins`;
    }
    return "—";
  };

  const formattedTime =
    session.createdAtFormatted ?? (session.created_at ? new Date(session.created_at).toLocaleString() : "");

  // Stronger label resolution to account for nested companion object / metadata
  const resolveLabel = () => {
    const direct =
      session?.name ||
      session?.display_name ||
      session?.title ||
      session?.subject ||
      session?.topic ||
      null;
    if (direct && String(direct).trim()) return String(direct).trim();

    // nested companion object from server
    const nestedCompanion =
      session?.companions?.name ||
      session?.companions?.display_name ||
      session?.companions?.title ||
      session?.companions?.name?.trim?.() ||
      null;
    if (nestedCompanion) return nestedCompanion;

    // companion_name or companion_name-like
    if ((session as any).companion_name) return (session as any).companion_name;
    if ((session as any).companionName) return (session as any).companionName;

    // metadata shapes
    const meta =
      session?.metadata?.title ||
      session?.metadata?.name ||
      session?.metadata?.companion?.name ||
      null;
    if (meta) return meta;

    // lastly fallback to short id
    return sessionId ? `Session ${String(sessionId).slice(0, 8)}` : "Session";
  };

  const handleTakeMeThere = useCallback(() => {
    if (sessionId) {
      router.push(`/sessions/${sessionId}/notes?openSummary=1`);
      return;
    }

    const companionId = companionIdFromProps ?? findCompanionIdFromDOM();
    if (!companionId) {
      alert("No session found for this companion.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/companions/${companionId}/recent-session`);
        if (!res.ok) {
          console.warn("recent-session lookup failed", res.status);
          alert("No recent session found for this companion.");
          return;
        }
        const j = await res.json().catch(() => null);
        const sid = j?.sessionId ?? j?.session_id ?? null;
        if (sid) {
          router.push(`/sessions/${sid}/notes?openSummary=1`);
          return;
        } else {
          alert("No recent session found for this companion.");
          return;
        }
      } catch (err) {
        console.error("recent-session lookup error", err);
        alert("Could not look up recent session for this companion.");
      }
    })();
  }, [router, sessionId, companionIdFromProps]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Keep handleDownloadNotes the same as before (no changes)
  const handleDownloadNotes = useCallback(async () => {
    setLoadingDownload(true);
    try {
      if (!sessionId) {
        alert("No session id available for download.");
        return;
      }
      const res = await fetch(`/api/sessions/${sessionId}/notes`);
      if (!res.ok) {
        alert("No notes available.");
        return;
      }
      const ctype = (res.headers.get("content-type") || "").toLowerCase();
      if (ctype.includes("application/json")) {
        const j = await res.json().catch(() => null);
        const txt = j?.ai_notes ?? j?.notes ?? j?.text ?? null;
        if (txt) {
          const blob = new Blob([typeof txt === "string" ? txt : JSON.stringify(txt, null, 2)], {
            type: "text/plain;charset=utf-8",
          });
          downloadBlob(blob, `edu-voice-session-${String(sessionId).slice(0, 8)}-notes.txt`);
          return;
        }
      }
      if (ctype.includes("text/plain")) {
        const txt = await res.text().catch(() => "");
        if (txt) {
          const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
          downloadBlob(blob, `edu-voice-session-${String(sessionId).slice(0, 8)}-notes.txt`);
          return;
        }
      }
      if (ctype.includes("application/pdf")) {
        const blob = await res.blob();
        downloadBlob(blob, `edu-voice-session-${String(sessionId).slice(0, 8)}.pdf`);
        return;
      }
      alert("No notes available.");
    } catch (err) {
      console.error("download notes error", err);
      alert("Download failed");
    } finally {
      setLoadingDownload(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // patch only: submitRating unchanged from your improved version
  const submitRating = useCallback(
    async (value: number) => {
      setRatingLoading(true);
      setUserRating(value); // optimistic
      try {
        if (sessionId) {
          const res = await fetch(`/api/sessions/${sessionId}/rating`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: value }),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => null);
            let parsed = null;
            try {
              parsed = text ? JSON.parse(text) : null;
            } catch {}
            console.warn("session rating failed", res.status, parsed ?? text);
            const companionId = companionIdFromProps ?? findCompanionIdFromDOM();
            if (companionId) {
              const cres = await fetch(`/api/companions/${companionId}/rating`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: value }),
              });
              if (!cres.ok) {
                const ctext = await cres.text().catch(() => null);
                let cparsed = null;
                try {
                  cparsed = ctext ? JSON.parse(ctext) : null;
                } catch {}
                console.warn("companion rating failed", cres.status, cparsed ?? ctext);
                alert(cparsed?.message ?? cparsed?.error ?? `Could not save rating. (${cres.status})`);
                setUserRating(null);
                return;
              }
              const cj = await cres.json().catch(() => null);
              setUserRating(cj?.rating ?? value);
              return;
            }
            alert(parsed?.message ?? parsed?.error ?? `Could not save rating. (${res.status})`);
            setUserRating(null);
            return;
          }

          const j = await res.json().catch(() => null);
          setUserRating(j?.rating ?? value);
          return;
        }

        const companionId = companionIdFromProps ?? findCompanionIdFromDOM();
        if (!companionId) {
          alert("No item to rate.");
          setUserRating(null);
          return;
        }

        const cres2 = await fetch(`/api/companions/${companionId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: value }),
        });
        if (!cres2.ok) {
          const txt = await cres2.text().catch(() => "");
          let parsed = null;
          try {
            parsed = txt ? JSON.parse(txt) : null;
          } catch {}
          console.warn("companion rating failed", cres2.status, parsed ?? txt);
          alert(parsed?.message ?? parsed?.error ?? `Could not save rating. (${cres2.status})`);
          setUserRating(null);
          return;
        }
        const cj2 = await cres2.json().catch(() => null);
        setUserRating(cj2?.rating ?? value);
      } catch (err) {
        console.error("submitRating error", err);
        alert("Failed to save rating. Try again.");
        setUserRating(null);
      } finally {
        setRatingLoading(false);
      }
    },
    [sessionId, companionIdFromProps]
  );

  // Delete handler for this row
  const handleDelete = useCallback(async () => {
    if (!sessionId) {
      alert("No session id to delete.");
      return;
    }
    if (!confirm("Delete this session? This will remove it from Recent Sessions and Home Recent Notes.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        let parsed = null;
        try {
          parsed = txt ? JSON.parse(txt) : null;
        } catch {}
        alert(parsed?.message ?? parsed?.error ?? `Failed to delete session (${res.status})`);
        setDeleting(false);
        return;
      }

      // hide row locally immediately
      setRemoved(true);

      // revalidate server-rendered data
      try {
        router.refresh();
      } catch (err) {
        console.debug("router.refresh() failed", err);
      }
    } catch (err) {
      console.error("delete session error", err);
      alert("Delete failed. Try again.");
      setDeleting(false);
    }
  }, [sessionId, router]);

  if (removed) return null;

  const Avatar = () => {
    const image =
      session.companion_image_url ??
      session.companions?.image_url ??
      session.companions?.avatar_url ??
      session.companions?.image ??
      (session as any).image ??
      null;

    if (image) {
      return (
        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={resolveLabel()} style={{ width: 48, height: 48, objectFit: "cover" }} />
        </div>
      );
    }
    const initial = String(session.name ?? session.title ?? sessionId ?? "?")[0]?.toUpperCase() ?? "?";
    return (
      <div className="w-12 h-12 rounded-md flex items-center justify-center bg-gray-100 text-gray-700 font-semibold border border-gray-200 flex-shrink-0">
        {initial}
      </div>
    );
  };

  const label = resolveLabel();

  return (
    <div
      className="session-item border rounded-lg p-4 flex items-center gap-4 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
      data-session-id={sessionId ?? undefined}
      data-companion-id={sessionId ? undefined : companionIdFromProps ?? undefined}
      role="group"
      style={{ opacity: deleting ? 0.6 : 1 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar />
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{label}</div>
          {formattedTime && <div className="text-xs text-muted-foreground mt-1">{formattedTime}</div>}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="text-2xl font-semibold">{getDurationText()}</div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadNotes()}
          aria-label={`Download notes for ${label}`}
          disabled={loadingDownload}
        >
          {loadingDownload ? "Preparing…" : "Download Notes"}
        </Button>

        <Button onClick={() => handleTakeMeThere()} aria-label={`Open notes for ${label}`}>
          Take me there
        </Button>

        <div className="flex items-center gap-1" aria-label="Rate this session">
          {Array.from({ length: 5 }).map((_, i) => {
            const val = i + 1;
            const filled = userRating !== null ? val <= userRating : false;
            return (
              <button
                key={val}
                type="button"
                onClick={() => submitRating(val)}
                disabled={ratingLoading}
                className={`px-2 py-1 rounded ${filled ? "bg-yellow-400/90 text-white" : "bg-gray-100 text-gray-700"} text-sm`}
                aria-label={`Rate ${val}`}
                title={`${val} star${val > 1 ? "s" : ""}`}
              >
                {filled ? "★" : "☆"}
              </button>
            );
          })}
        </div>

        {/* Delete button */}
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
