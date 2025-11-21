// components/TakeMeThereClient.tsx
"use client";

import { useEffect } from "react";

/**
 * TakeMeThereClient
 * - Runs only on the client.
 * - Attaches a click handler to "Take me there" buttons/links so we can
 *   navigate to /sessions/<id>/notes?openSummary=1 if the ancestor DOM node exposes data-session-id
 *   or data-companion-id. Uses the server endpoint at /api/companions/:id/latest-session
 *   to look up the most recent session when necessary.
 */
export default function TakeMeThereClient() {
  useEffect(() => {
    const attach = () => {
      const nodes = Array.from(document.querySelectorAll("button, a"));

      nodes.forEach((node) => {
        const text = (node.textContent || "").trim().toLowerCase();
        if (!text.includes("take me there")) return;

        if ((node as any).__tmt_attached) return;
        (node as any).__tmt_attached = true;

        node.addEventListener("click", async (ev: Event) => {
          try {
            const el = ev.currentTarget as HTMLElement;

            // Try to find an explicit session id on an ancestor
            let row = el.closest("[data-session-id]") as HTMLElement | null;
            let sessionId = row?.getAttribute?.("data-session-id") ?? null;

            // If no session id, try companion id on row or ancestor
            if (!sessionId) {
              const companionRow =
                el.closest("[data-companion-id]") ||
                el.closest(".companion-card, .session-card, .session-item, .note-row");

              const companionId = companionRow?.getAttribute?.("data-companion-id") ?? null;

              if (companionId) {
                // intercept and try to look up latest session id
                ev.preventDefault();
                try {
                  // NOTE: we call the route implemented at app/api/companions/[id]/latest-session
                  const res = await fetch(`/api/companions/${companionId}/latest-session`);
                  if (res.ok) {
                    const j = await res.json().catch(() => null);
                    const sid = j?.latest_session_id ?? j?.sessionId ?? j?.session_id ?? null;
                    if (sid) {
                      window.location.href = `/sessions/${sid}/notes?openSummary=1`;
                      return;
                    } else {
                      alert("No recent session found for this companion.");
                      return;
                    }
                  } else {
                    // graceful fallback message
                    const txt = await res.text().catch(() => "");
                    console.warn("latest-session non-ok:", res.status, txt?.slice?.(0, 200));
                    alert("Could not find a recent session for that companion.");
                    return;
                  }
                } catch (err) {
                  console.error("latest-session fetch failed", err);
                  alert("Could not look up recent session for this companion.");
                  return;
                }
              }
            }

            if (sessionId) {
              ev.preventDefault();
              // navigate to beautified notes page (explicit /notes)
              window.location.href = `/sessions/${sessionId}/notes?openSummary=1`;
              return;
            }

            // otherwise allow default navigation (e.g., link to companion page)
          } catch (e) {
            // don't block default behavior on unexpected errors
            console.error("TakeMeThere handler error:", e);
          }
        });
      });
    };

    attach();

    const mo = new MutationObserver(() => {
      attach();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, []);

  return null;
}
