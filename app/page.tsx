// app/page.tsx
export const dynamic = "force-dynamic";

import SessionRowClient from "@/components/SessionRowClient";
import CTA from "@/components/Cta";
import TakeMeThereClient from "@/components/TakeMeThereClient"; // client component
import { getUserSessions } from "@/lib/server/companion.actions";
import LandingPageWrapper from "./LandingPageWrapper";
import { safeCurrentUser } from "@/lib/safeCurrentUser";
import { cookies } from "next/headers";

type ProSessionPayload = {
  email: string;
  issued_at?: string;
  username?: string;
};

/**
 * Attempt to read a lightweight "pro_session" cookie and synthesize a user
 * object when Clerk is not present. This allows approved pro users to be
 * treated as 'signed-in' for server-rendered pages without touching Clerk.
 *
 * NOTE: cookies() is async in modern Next.js runtimes — we must await it.
 */
async function tryReadProSession(): Promise<{ id?: string; email?: string; username?: string } | null> {
  try {
    const ck = await cookies();
    const c = ck.get("pro_session")?.value ?? null;
    if (!c) return null;
    // cookie stored as base64(JSON)
    try {
      const json = JSON.parse(Buffer.from(c, "base64").toString("utf8")) as ProSessionPayload;
      if (!json?.email) return null;
      const username = json.username ?? (json.email.split("@")[0] ?? "pro-user");
      // lightweight synthetic user id (not a Clerk UUID) — keep as email-based id
      return { id: `pro-${json.email}`, email: json.email, username };
    } catch (err) {
      return null;
    }
  } catch (err) {
    return null;
  }
}

const Page = async () => {
  // robustly call currentUser so unexpected Clerk errors don't crash the server render
  let user: any = null;
  try {
    user = await safeCurrentUser();
  } catch (err: any) {
    // safeCurrentUser already logs; ensure fallback
    console.error("safeCurrentUser() threw unexpectedly in app/page.tsx:", err);
    user = null;
  }

  // If Clerk didn't provide a user, try lightweight pro_session fallback.
  if (!user) {
    const pro = await tryReadProSession();
    if (pro) {
      // Synthesize a minimal user object similar to Clerk's shape used in your components.
      user = {
        id: pro.id,
        emailAddresses: [{ emailAddress: pro.email }],
        username: pro.username,
      };
    }
  }

  if (!user) {
    return <LandingPageWrapper />;
  }

  // server-side fetch recent sessions (user-scoped)
  let recentSessionsCompanions: any[] = [];
  try {
    const rows = await getUserSessions(user.id);
    if (Array.isArray(rows)) {
      recentSessionsCompanions = rows.slice(0, 50);
    } else {
      recentSessionsCompanions = [];
    }
  } catch (err: any) {
    console.error("Failed to fetch recent sessions for user:", user?.id, err);
    recentSessionsCompanions = [];
  }

  const displayName =
    user.username ?? user.emailAddresses?.[0]?.emailAddress?.split?.("@")?.[0] ?? "learner";

  const nameChars = Array.from(displayName);

  return (
    <>
      {/* client helper mounts only on the client */}
      <div suppressHydrationWarning>
        <TakeMeThereClient />
      </div>

      <main className="px-8 py-6">
        {/* Animated welcome banner */}
        <div className="welcome-banner mb-6">
          <h1 className="welcome-banner-title" aria-live="polite">
            <span className="welcome-prefix">Welcome back, </span>
            <span className="welcome-name" aria-hidden>
              {nameChars.map((ch, idx) => (
                <span
                  key={`${ch}-${idx}`}
                  className="welcome-char"
                  style={{ ["--i" as any]: idx }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              ))}
            </span>
          </h1>

          <p className="welcome-banner-sub">Nice to see you — continue where you left off.</p>
        </div>

        {/* Centered existing CTA (reuses CTA component) */}
        <div className="center-cta mb-8" aria-hidden={false}>
          <div className="center-cta-inner">
            <CTA />
          </div>
        </div>

        {/* RECENT NOTES */}
        <section className="recent-section">
          <h2 className="text-2xl font-bold mb-4">Recent Notes</h2>

          <div className="home-section">
            <div className="flex-1">
              <div className="recent-notes space-y-3">
                {(!recentSessionsCompanions || recentSessionsCompanions.length === 0) && (
                  <div className="text-gray-600">No recent sessions yet.</div>
                )}

                {recentSessionsCompanions?.map((s: any, idx: number) => {
                  // create a deterministic, server-side formatted date string to avoid hydration mismatches
                  const createdAtFormatted = s?.created_at ? new Date(s.created_at).toUTCString() : null;

                  // compatibility: some helpers return s.companions, some s.companion, or nested companion
                  const compObj =
                    s.companion ??
                    s.companions ??
                    (Array.isArray(s.companions) ? s.companions[0] : null) ??
                    null;

                  return (
                    <div key={`${s.id ?? idx}-${idx}`} data-session-id={s.id} className="session-item">
                      {/* Use lightweight client row to render simplified home-list row */}
                      <SessionRowClient
                        session={{
                          id: s.id,
                          // map both singular and plural keys so either component version works:
                          companion: compObj,
                          companions: compObj,

                          // human-friendly label: prefer companion name
                          name:
                            compObj?.name ??
                            s.metadata?.title ??
                            s.name ??
                            `Session ${String(s.id ?? "").slice(0, 8)}`,

                          // subject mapping for icon logic
                          subject: compObj?.subject ?? s.metadata?.topic ?? null,

                          // explicit image if provided (left as null if not)
                          companion_image_url:
                            compObj?.image_url ??
                            compObj?.companion_image_url ??
                            s.companion_image_url ??
                            null,

                          created_at: s.created_at,
                          createdAtFormatted,
                          duration_minutes:
                            s.duration_minutes ?? s.duration ?? s.metadata?.duration_minutes ?? null,
                          duration_seconds: s.duration_seconds ?? s.metadata?.duration_seconds ?? null,
                          metadata: s.metadata ?? null,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* removed reserved area so the notes list stretches to the right within content area */}
          </div>
        </section>
      </main>
    </>
  );
};

export default Page;
