// components/CompanionsList.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn, getSubjectColor } from "@/lib/utils";
import Link from "next/link";
import CompanionIcon from "@/components/CompanionIcon";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Companion {
  id: string;
  subject?: string | null;
  name?: string | null;
  topic?: string | null;
  companion_image_url?: string | null;
  title?: string | null;
  // optional server-provided field (recommended)
  latest_session_id?: string | null;
  bookmarked?: boolean | null;
}

interface CompanionsListProps {
  title: string;
  companions?: Companion[];
  classNames?: string;
}

export default function CompanionsList({
  title,
  companions,
  classNames,
}: CompanionsListProps) {
  const router = useRouter();
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  // local copy of companions so we can remove items optimistically
  const [items, setItems] = useState<Companion[]>(() => (companions ?? []));

  // update items when the source companion list changes
  useEffect(() => {
    setItems(companions ?? []);
  }, [companions?.map?.((c) => c.id).join(",")]);

  // stable primitive key — only changes when companion ids change
  const companionIdsKey = (companions ?? []).map((c) => c.id).join(",");

  // Single safe effect to hydrate ratings (localStorage -> /api/companions/ratings-all -> per-companion)
  useEffect(() => {
    let mounted = true;

    async function loadRatings() {
      // 1) seed from localStorage (instant)
      try {
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem("eva_companion_ratings")
            : null;
        const parsedStored: Record<string, number> = stored
          ? JSON.parse(stored)
          : {};
        if (mounted && Object.keys(parsedStored).length > 0) {
          setRatings(parsedStored);
        }
      } catch (e) {
        // ignore localStorage parse errors
      }

      // 2) try a single endpoint that returns all ratings (recommended if available)
      try {
        const allRes = await fetch("/api/companions/ratings-all");
        if (allRes.ok) {
          const allJson = await allRes.json().catch(() => null);
          if (mounted && allJson && typeof allJson === "object") {
            setRatings((prev) => {
              const merged = { ...prev, ...allJson };
              try {
                window.localStorage.setItem(
                  "eva_companion_ratings",
                  JSON.stringify(merged)
                );
              } catch {}
              return merged;
            });
            return; // done
          }
        }
      } catch (e) {
        // ignore; fallback to per-companion fetch
      }

      // 3) fallback: fetch each companion rating individually (for listed companions)
      const ids = (companions ?? []).map((c) => c.id);
      await Promise.all(
        ids.map(async (id) => {
          try {
            const rRes = await fetch(`/api/companions/${id}/rating`);
            if (!rRes.ok) return;
            const rJson = await rRes.json().catch(() => null);
            const r = typeof rJson?.rating === "number" ? rJson.rating : null;
            if (mounted && typeof r === "number") {
              setRatings((prev) => {
                if (prev[id] === r) return prev;
                const next = { ...prev, [id]: r };
                try {
                  window.localStorage.setItem(
                    "eva_companion_ratings",
                    JSON.stringify(next)
                  );
                } catch {}
                return next;
              });
            }
          } catch (e) {
            // ignore individual fetch failures
          }
        })
      );
    }

    loadRatings();

    return () => {
      mounted = false;
    };
  }, [companionIdsKey]); // only re-run when the list of companion ids actually changes

  const uniqueCompanions = Array.from(
    new Map((items ?? []).map((c) => [c.id, c])).values()
  );

  // helper: ensure we have a sessionId (tries companion.latest_session_id then API)
  async function resolveLatestSessionId(
    companionId: string,
    companionPropSessionId?: string | null
  ) {
    if (companionPropSessionId) return companionPropSessionId;
    try {
      // server route at app/api/companions/[id]/latest-session/route.ts
      const res = await fetch(`/api/companions/${companionId}/latest-session`);
      if (!res.ok) return null;
      const j = await res.json().catch(() => null);
      // keep backward-compatible keys
      return (
        j?.latest_session_id ?? j?.sessionId ?? j?.session_id ?? null
      );
    } catch (e) {
      return null;
    }
  }

  // download notes: resolves latest session then attempts notes endpoint (pdf preferred)
  async function handleDownloadNotes(
    companionId: string,
    companionPropSessionId?: string | null
  ) {
    setErrorMsg(null);
    setPdfLoadingId(companionId);
    try {
      const sessionId = await resolveLatestSessionId(
        companionId,
        companionPropSessionId
      );
      if (!sessionId) throw new Error("No recent session found for this companion.");

      // prefer PDF version of notes if supported
      const res = await fetch(`/api/sessions/${sessionId}/notes?format=pdf`, {
        headers: { Accept: "application/pdf, application/json, text/plain" },
      });

      if (!res.ok) {
        // avoid treating an HTML error page as valid content
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          // server returned an HTML error page — treat as not found
          throw new Error("Notes not available (server returned HTML).");
        }
      }

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/pdf")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `edu-voice-session-${sessionId.slice(0, 8)}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return;
        } else {
          // maybe JSON text or plain text
          const text = await res.text();
          // try parse json
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
          const notes =
            parsed?.notes ?? parsed?.ai_notes ?? parsed?.text ?? text ?? null;

          // If what we got looks like an HTML page, show friendly error
          if (typeof notes === "string" && notes.trim().startsWith("<!DOCTYPE")) {
            throw new Error("Notes not available.");
          }

          if (notes) {
            const blob = new Blob(
              [typeof notes === "string" ? notes : JSON.stringify(notes, null, 2)],
              { type: "text/plain;charset=utf-8" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `edu-voice-session-${sessionId.slice(0, 8)}-notes.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            return;
          }
        }
      }

      // fallback: ask transcript endpoint
      const tRes = await fetch(`/api/sessions/${sessionId}/transcript`);
      if (tRes.ok) {
        const contentType = tRes.headers.get("content-type") || "";
        if (contentType.includes("text/html")) {
          throw new Error("Transcript not available.");
        }
        const txt = await tRes.text();
        const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `edu-voice-session-${sessionId.slice(0, 8)}-transcript.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      throw new Error("No downloadable notes or transcript found.");
    } catch (err: any) {
      console.error("Download notes error:", err);
      setErrorMsg(String(err?.message ?? err));
    } finally {
      setPdfLoadingId(null);
    }
  }

  // rating: optimistic + POST to server route
  async function submitRating(companionId: string, value: number) {
    // optimistic locally + persist to localStorage so UI survives unmounts
    setRatings((r) => {
      const next = { ...r, [companionId]: value };
      try {
        window.localStorage.setItem("eva_companion_ratings", JSON.stringify(next));
      } catch {}
      return next;
    });

    async function postOnce() {
      const res = await fetch(`/api/companions/${companionId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });

      const text = await res.text().catch(() => "");
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      if (!res.ok) {
        const serverMsg = parsed?.error ?? parsed?.message ?? text ?? `Status ${res.status}`;
        throw new Error(serverMsg);
      }

      const serverRating = parsed?.rating ?? parsed?.savedRating ?? null;
      return { parsed, serverRating };
    }

    try {
      try {
        const result = await postOnce();
        if (typeof result.serverRating === "number") {
          setRatings((prev) => {
            const next = { ...prev, [companionId]: result.serverRating };
            try {
              window.localStorage.setItem("eva_companion_ratings", JSON.stringify(next));
            } catch {}
            return next;
          });
        }
        return;
      } catch (err) {
        console.warn("Rating save failed, retrying once:", err);
        const retry = await postOnce();
        if (typeof retry.serverRating === "number") {
          setRatings((prev) => {
            const next = { ...prev, [companionId]: retry.serverRating };
            try {
              window.localStorage.setItem("eva_companion_ratings", JSON.stringify(next));
            } catch {}
            return next;
          });
        }
        return;
      }
    } catch (err: any) {
      console.error("submitRating final error:", err);
      setErrorMsg(`Could not save rating. ${String(err?.message ?? "")}`);
    }
  }

  // inline star component
  function StarRating({
    companionId,
    initial = 0,
  }: {
    companionId: string;
    initial?: number;
  }) {
    const current = ratings[companionId] ?? initial;
    const [hover, setHover] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const click = async (n: number) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        await submitRating(companionId, n);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="flex items-center gap-2">
        <div className="flex select-none" aria-hidden>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover ?? current) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onClick={() => click(n)}
                className={cn(
                  "px-1 py-0.5 text-lg leading-none rounded focus:outline-none",
                  active ? "scale-105" : "opacity-60"
                )}
                aria-label={`${n} star`}
              >
                {active ? "★" : "☆"}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground">
          {submitting ? "Saving…" : current ? `${current}/5` : "Rate"}
        </div>
      </div>
    );
  }

  // NEW: Delete companion (soft-delete) handler for rows
  const handleDeleteCompanion = async (companionId: string) => {
    const ok = confirm(
      "Delete this companion? This will remove it from the Companion Library and My Journey."
    );
    if (!ok) return;

    try {
      // optimistic remove locally
      setItems((prev) => prev.filter((p) => p.id !== companionId));

      const res = await fetch(`/api/companions/${companionId}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        // restore on failure
        setItems((prev) => {
          // if it was removed earlier, try re-inserting from original props
          const orig = companions?.find((c) => c.id === companionId);
          if (orig) return [...prev, orig];
          return prev;
        });
        let text = "";
        try {
          text = await res.text();
        } catch {}
        console.error("delete companion failed", res.status, text);
        alert(`Could not delete companion. (${res.status})`);
        return;
      }

      // refresh server lists
      try {
        router.refresh();
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error("delete companion error", err);
      alert("Could not delete companion. Try again.");
    }
  };

  // NEW: Remove bookmark handler (row-level)
  const handleRemoveBookmark = async (companionId: string) => {
    const ok = confirm("Remove bookmark for this companion?");
    if (!ok) return;

    try {
      // optimistic remove bookmark flag locally
      setItems((prev) => prev.map((p) => (p.id === companionId ? { ...p, bookmarked: false } : p)));

      const res = await fetch(`/api/bookmarks/${companionId}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        // rollback
        setItems((prev) => prev.map((p) => (p.id === companionId ? { ...p, bookmarked: true } : p)));
        let text = "";
        try {
          text = await res.text();
        } catch {}
        console.error("remove bookmark failed", res.status, text);
        alert(`Could not remove bookmark. (${res.status})`);
        return;
      }

      // refresh server lists so home/my-journey update
      try {
        router.refresh();
      } catch (e) {}
    } catch (err) {
      console.error("remove bookmark error", err);
      alert("Could not remove bookmark. Try again.");
    }
  };

  return (
    <article className={cn("companion-list", classNames ?? "")}>
      <h2 className="font-bold text-3xl mb-4">{title}</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-lg">Lessons</TableHead>
            <TableHead className="text-lg text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {uniqueCompanions.map((c) => (
            <TableRow key={c.id} data-companion-id={c.id}>
              <TableCell>
                <Link href={`/companions/${c.id}`} className="flex items-center gap-2">
                  <div
                    className="size-[72px] flex items-center justify-center rounded-lg max-md:hidden"
                    style={{ backgroundColor: getSubjectColor(c.subject) }}
                  >
                    <CompanionIcon
                      subject={c.subject ?? c.topic ?? c.name ?? c.title ?? undefined}
                      iconUrl={c.companion_image_url ?? undefined}
                      size={40}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col gap-2 min-w-0">
                    <p className="font-bold text-2xl truncate">{c.name ?? c.title ?? "Untitled"}</p>
                    <p className="text-lg truncate">{c.topic}</p>
                  </div>
                </Link>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-4 justify-end">
                  {/* Take me there -> latest session notes if available */}
                  <Link
                    href={
                      c.latest_session_id
                        ? `/sessions/${c.latest_session_id}/notes?openSummary=1`
                        : `/companions/${c.id}`
                    }
                    data-companion-id={c.id}
                    className="mj-small-btn px-3 py-2 rounded-full border border-gray-200 bg-white shadow-sm text-sm"
                  >
                    Take me there
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadNotes(c.id, c.latest_session_id ?? undefined)}
                    disabled={pdfLoadingId === c.id}
                  >
                    {pdfLoadingId === c.id ? "Preparing…" : "Download notes"}
                  </Button>

                  <StarRating companionId={c.id} initial={ratings[c.id] ?? 0} />

                  {/* Remove bookmark (if bookmarked) */}
                  {c.bookmarked ? (
                    <button
                      onClick={() => handleRemoveBookmark(c.id)}
                      className="px-2 py-1 rounded-md border border-gray-200 bg-white text-sm"
                      title="Remove bookmark"
                    >
                      Remove bookmark
                    </button>
                  ) : null}

                  {/* Delete companion */}
                  <button
                    onClick={() => handleDeleteCompanion(c.id)}
                    className="px-2 py-1 rounded-md border border-red-100 bg-white text-sm text-red-600"
                    title="Delete companion"
                  >
                    Delete
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {errorMsg && (
        <p className="mt-3 text-sm text-red-600" role="status" aria-live="polite">
          {errorMsg}
        </p>
      )}
    </article>
  );
}
