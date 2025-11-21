// components/RecentSessionsClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import CompanionIcon from "@/components/CompanionIcon";
import { getSubjectColor } from "@/lib/utils";

type Session = {
  id: string;
  name?: string | null;
  title?: string | null;
  display_name?: string | null;
  topic?: string | null;
  subject?: string | null;
  companion_id?: string | null;
  companion_name?: string | null;
  companion_image_url?: string | null;
  companions?: any | null; // nested companion row from server
  created_at?: string | null;
  createdAtFormatted?: string | null;
  duration_minutes?: number | null;
  duration_seconds?: number | null;
  metadata?: Record<string, any> | null;
  transcript_summary?: string | null;
  deleted_at?: string | null;
  [k: string]: any;
};

export default function RecentSessionsClient({ sessions }: { sessions: Session[] }) {
  const router = useRouter();

  const [companionNames, setCompanionNames] = useState<Record<string, string>>({});
  const [compLoading, setCompLoading] = useState<Record<string, boolean>>({});
  // local deletion state (maps sessionId -> deleting boolean)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // Keep a local copy of sessions so we can remove items immediately without waiting for server revalidation
  const [sessionsLocal, setSessionsLocal] = useState<Session[]>(sessions ?? []);

  // Keep sessionsLocal in sync when server props change
  useEffect(() => {
    setSessionsLocal(sessions ?? []);
  }, [sessions]);

  // dedupe sessions preserving order
  const uniqueSessions = useMemo(
    () => Array.from(new Map((sessionsLocal ?? []).map((s) => [s.id, s])).values()),
    [sessionsLocal]
  );

  // Defensive helper: find candidate fields everywhere
  const findPossibleCompanionName = (s: Session) => {
    // direct fields
    const direct =
      s.name ||
      s.display_name ||
      s.title ||
      s.companion_name ||
      s["companionName"] ||
      s["session_title"] ||
      s["session_name"] ||
      null;

    if (direct && String(direct).trim()) return String(direct).trim();

    // nested companion object (server-side join could be under 'companions' or 'companion')
    const nested =
      s.companions?.name ||
      s.companions?.display_name ||
      s.companions?.title ||
      s.companions?.name?.trim?.() ||
      s.companion?.name ||
      s.companion?.display_name ||
      null;
    if (nested && String(nested).trim()) return String(nested).trim();

    // sometimes image / data shape contains name inside metadata object
    const metaName =
      s.metadata?.title ||
      s.metadata?.name ||
      s.metadata?.companion?.name ||
      s.metadata?.display_name ||
      null;
    if (metaName && String(metaName).trim()) return String(metaName).trim();

    // sometimes companion id maps to a cached name
    if (s.companion_id && companionNames[s.companion_id]) return companionNames[s.companion_id];

    return null;
  };

  // compute label candidates (keeps original logic plus nested checks)
  const computeRawLabel = (s: Session) => {
    const c = findPossibleCompanionName(s);
    if (c) return c;

    // older fallback: transcript summary / topic / subject
    if (s.transcript_summary) return String(s.transcript_summary).slice(0, 40);
    if (s.topic) return String(s.topic);
    if (s.subject) return String(s.subject);
    return "";
  };

  // attempt to fetch companion names when no label available but companion_id exists
  useEffect(() => {
    let mounted = true;
    const needFetch: string[] = [];

    uniqueSessions.forEach((s) => {
      const raw = computeRawLabel(s);
      const looksEmpty = !raw || raw.length === 0;
      if ((looksEmpty || raw.toLowerCase().startsWith("session ")) && s.companion_id) {
        if (!companionNames[s.companion_id]) needFetch.push(s.companion_id);
      }
    });

    const uniqueIds = Array.from(new Set(needFetch));
    if (uniqueIds.length === 0) return;

    (async () => {
      const nextNames: Record<string, string> = {};
      const nextLoading: Record<string, boolean> = {};
      for (const cid of uniqueIds) {
        if (!mounted) break;
        try {
          nextLoading[cid] = true;
          const res = await fetch(`/api/companions/${cid}`);
          if (!res.ok) {
            nextLoading[cid] = false;
            continue;
          }
          const json = await res.json().catch(() => null);
          const name =
            (json?.name && String(json.name).trim()) ||
            (json?.title && String(json.title).trim()) ||
            (json?.display_name && String(json.display_name).trim()) ||
            (json?.data?.name && String(json.data.name).trim()) ||
            null;
          if (name) nextNames[cid] = name;
          nextLoading[cid] = false;
        } catch (e) {
          nextLoading[cid] = false;
        }
      }
      if (!mounted) return;
      setCompLoading((prev) => ({ ...prev, ...nextLoading }));
      setCompanionNames((prev) => ({ ...prev, ...nextNames }));
    })();

    return () => {
      mounted = false;
    };
    // intentionally not including companionNames to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueSessions.length]);

  const getDurationText = (s: Session) => {
    if (typeof s.duration_minutes === "number") return `${Math.round(s.duration_minutes)} mins`;
    if (typeof s.duration_seconds === "number") return `${Math.round(s.duration_seconds / 60)} mins`;
    return "— mins";
  };

  const getLabel = (s: Session) => {
    // prefer computeRawLabel (includes nested checks)
    const raw = computeRawLabel(s);
    if (raw && raw.length > 0) return raw;

    // additional attempts for common shapes
    if (s.companion_name) return s.companion_name;
    if (s.companions?.name) return s.companions.name;
    if (s.companions?.title) return s.companions.title;
    if (s.metadata?.title) return s.metadata.title;

    // final fallback: short id
    return `Session ${String(s.id).slice(0, 8)}`;
  };

  const getTimeText = (s: Session) => {
    if (s.createdAtFormatted) return s.createdAtFormatted;
    if (s.created_at) {
      try {
        return new Date(s.created_at).toLocaleString();
      } catch {
        return String(s.created_at);
      }
    }
    return "";
  };

  // If nothing yields a good label, print one session to console to inspect shape
  useEffect(() => {
    if (!uniqueSessions || uniqueSessions.length === 0) return;
    const sample = uniqueSessions.find((s) => {
      const raw = computeRawLabel(s);
      return !raw || raw.length === 0;
    });
    if (sample) {
      console.debug("[RecentSessionsClient] sample session missing label — inspect shape:", sample);
    }
  }, [uniqueSessions]);

  // Delete handler: optimistic remove + router.refresh()
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Delete this session? This will remove it from Recent Sessions and Home Recent Notes.")) return;
    setDeleting((prev) => ({ ...prev, [sessionId]: true }));

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        let parsed = null;
        try {
          parsed = txt ? JSON.parse(txt) : null;
        } catch {}
        alert(parsed?.message ?? parsed?.error ?? `Failed to delete session (${res.status}).`);
        setDeleting((prev) => ({ ...prev, [sessionId]: false }));
        return;
      }

      // optimistic removal from local list
      setSessionsLocal((prev) => prev.filter((x) => x.id !== sessionId));

      // allow server to revalidate — refresh will re-fetch server components
      try {
        router.refresh();
      } catch (err) {
        // ignore router.refresh errors in older Next versions
        console.debug("router.refresh() failed or not available", err);
      }
    } catch (err) {
      console.error("delete session error", err);
      alert("Delete failed. Try again.");
      setDeleting((prev) => ({ ...prev, [sessionId]: false }));
    } finally {
      // ensure deleting flag removed after a short delay to avoid flicker
      setTimeout(() => setDeleting((prev) => ({ ...prev, [sessionId]: false })), 600);
    }
  };

  return (
    <div className="recent-sessions w-full">
      <div className="space-y-5">
        {uniqueSessions.map((s) => {
          const label = getLabel(s);
          const time = getTimeText(s);
          const subject = (s.subject ?? s.topic ?? s.companion_subject ?? undefined) as string | undefined;
          const isDeleting = !!deleting[s.id];

          return (
            <div
              key={s.id}
              data-session-id={s.id}
              className="w-full rounded-xl bg-white border border-gray-100 shadow-lg p-4 flex items-center gap-6 justify-between
                         transition-transform duration-200 will-change-transform hover:-translate-y-1 hover:shadow-2xl"
              style={{ minWidth: 0, opacity: isDeleting ? 0.6 : 1 }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-[64px] h-[64px] rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: getSubjectColor(subject) }}
                  aria-hidden
                >
                  {s.companion_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.companion_image_url}
                      alt={label}
                      style={{ width: 52, height: 52, objectFit: "cover" }}
                      className="rounded-md"
                    />
                  ) : s.companions?.image_url || s.companions?.avatar_url || s.companions?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.companions?.image_url ?? s.companions?.avatar_url ?? s.companions?.image}
                      alt={label}
                      style={{ width: 52, height: 52, objectFit: "cover" }}
                      className="rounded-md"
                    />
                  ) : (
                    <CompanionIcon subject={subject ?? label} size={40} className="rounded-md" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{label}</div>
                  {time && <div className="text-xs text-muted-foreground mt-1">{time}</div>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-2 rounded-lg bg-white border border-gray-100 shadow-sm text-sm">
                  {getDurationText(s)}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    router.push(`/sessions/${s.id}/notes?openSummary=1`);
                  }}
                >
                  Take me there
                </Button>

                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/sessions/${s.id}/notes?format=pdf`, { method: "GET" });
                      if (res.ok && (res.headers.get("content-type") || "").includes("application/pdf")) {
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `edu-voice-session-${s.id.slice(0, 8)}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        return;
                      }

                      const text = await res.text().catch(() => "");
                      let parsed;
                      try {
                        parsed = text ? JSON.parse(text) : null;
                      } catch {
                        parsed = null;
                      }
                      const notes = parsed?.notes ?? parsed?.ai_notes ?? text ?? null;
                      if (notes) {
                        const blob = new Blob([typeof notes === "string" ? notes : JSON.stringify(notes, null, 2)], {
                          type: "text/plain;charset=utf-8",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `edu-voice-session-${s.id.slice(0, 8)}-notes.txt`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        return;
                      }

                      const tRes = await fetch(`/api/sessions/${s.id}/transcript`);
                      if (tRes.ok) {
                        const txt = await tRes.text();
                        const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `edu-voice-session-${s.id.slice(0, 8)}-transcript.txt`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        return;
                      }

                      alert("No downloadable notes or transcript available for this session.");
                    } catch (err) {
                      console.error("Download notes error", err);
                      alert("Could not download notes. Try again.");
                    }
                  }}
                >
                  Download Notes
                </Button>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSession(s.id)}
                  disabled={isDeleting}
                  aria-label={`Delete session ${s.id}`}
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
