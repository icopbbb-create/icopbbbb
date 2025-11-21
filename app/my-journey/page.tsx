// app/my-journey/page.tsx
export const dynamic = "force-dynamic";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { redirect } from "next/navigation";
import { safeCurrentUser } from "@/lib/safeCurrentUser";
import {
  getUserCompanions,
  getUserSessions,
  getBookmarkedCompanions,
} from "@/lib/server/companion.actions";
import Image from "next/image";
import CompanionsList from "@/components/CompanionsList";
import Link from "next/link";
import RecentSessionsClient from "@/components/RecentSessionsClient";
import TakeMeThereClient from "@/components/TakeMeThereClient";
import CreditsCard from "@/components/CreditsCard";

const Profile = async () => {
  const user = await safeCurrentUser();
  if (!user) redirect("/sign-in");

  // All server-side data helpers are called with user.id to ensure per-user scoping.
  const companions = await getUserCompanions(user.id);
  const sessionHistory = await getUserSessions(user.id);
  const bookmarkedCompanions = await getBookmarkedCompanions(user.id);

  // Deduplicate sessions by id
  const uniqueSessions = Array.from(
    new Map(sessionHistory.map((s: any) => [s.id, s])).values()
  );

  const lessonsCompleted = uniqueSessions.length;
  const companionsCreated = companions.length;

  return (
    <>
      {/* Banner container style / animation definitions */}
      <style>{`
        /* Banner: slow glow/pulse */
        @keyframes edu-credit-pulse {
          0% { box-shadow: 0 6px 10px rgba(255,120,80,0.06); transform: translateY(0); }
          50% { box-shadow: 0 20px 40px rgba(255,120,80,0.14); transform: translateY(-1px); }
          100% { box-shadow: 0 6px 10px rgba(255,120,80,0.06); transform: translateY(0); }
        }

        .edu-credit-banner {
          max-width: 1100px;
          margin: 14px auto;
          padding: 14px 20px;
          border-radius: 12px;
          background: linear-gradient(90deg, rgba(255,240,234,0.95), rgba(255,245,238,0.95));
          border: 1px solid rgba(255,170,120,0.22);
          color: #7a2b12;
          box-shadow: 0 8px 30px rgba(255,150,100,0.06);
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          animation: edu-credit-pulse 2.6s ease-in-out infinite;
          position: relative;
          z-index: 30;
        }

        .edu-credit-banner .left {
          display:flex;
          gap:10px;
          align-items:center;
        }

        .edu-credit-banner .icon {
          width:40px;
          height:40px;
          border-radius:8px;
          background: linear-gradient(180deg, #fff3ea, #ffe0cc);
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow: 0 6px 18px rgba(255,140,80,0.12);
        }

        .edu-credit-banner strong { font-weight:700; font-size:15px; }
        .edu-credit-banner .sub { font-size:13px; opacity:0.95; }

        /* Small responsive tweak */
        @media (max-width: 880px) {
          .edu-credit-banner { margin: 10px 16px; flex-direction: column; align-items:flex-start; gap:8px; }
          .edu-credit-banner .right { align-self: stretch; display:flex; justify-content:flex-end; width:100%; }
        }
      `}</style>

      {/* Placeholder: the client script will inject the banner here (so it sits between navbar & header) */}
      <div id="edu-credit-banner-root" aria-hidden="true" />

      {/* Client-side script: fetch credit status and show/hide banner dynamically */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function () {
            const root = document.getElementById('edu-credit-banner-root');
            if (!root) return;
            // Avoid multiple injections
            function removeBanner() {
              const existing = document.getElementById('__edu_credit_banner');
              if (existing) existing.remove();
              root.setAttribute('aria-hidden', 'true');
            }
            function renderBanner(remaining) {
              removeBanner();
              const div = document.createElement('div');
              div.id = '__edu_credit_banner';
              div.className = 'edu-credit-banner';
              div.innerHTML = '<div class="left"><div class="icon">⚠️</div><div><div><strong>You are running low on credits — ' + remaining + ' remaining</strong></div><div class="sub">Recharge soon to avoid interruptions.</div></div></div><div class="right"><a href="/subscription/pro" class="edu-credit-cta" style="background: linear-gradient(90deg,#ff7a3a,#fe5933); padding:8px 12px; color: white; border-radius:8px; font-weight:600; text-decoration:none;">Upgrade / Recharge</a></div>';
              root.setAttribute('aria-hidden', 'false');
              root.appendChild(div);
            }

            // fetch credits and show banner if <= threshold
            async function checkCredits() {
              try {
                const res = await fetch('/api/credits/me', { cache: 'no-store' });
                if (!res.ok) { removeBanner(); return; }
                const json = await res.json();
                const remaining = Number(json.credits_remaining ?? 0);
                const threshold = 15;
                if (remaining <= threshold && remaining >= 0) {
                  renderBanner(remaining);
                } else {
                  removeBanner();
                }
              } catch (e) {
                // fail silently; no banner
                removeBanner();
              }
            }

            // initial check on load
            window.addEventListener('load', () => {
              setTimeout(checkCredits, 80);
            });

            // also listen for visibility focus to refresh (useful when admin updates credits)
            window.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                checkCredits();
              }
            });

            // optional: poll once every 45s while on page (so if admin recharges quickly it updates)
            const interval = setInterval(checkCredits, 45000);
            // cleanup in case of SPA navigations: attempt to clear on unload
            window.addEventListener('beforeunload', () => clearInterval(interval));
          })();
        `,
          }}
      />

      <main className="max-w-[1260px] mx-auto px-6 py-10 min-h-[72vh]">
        {/* HERO */}
        <header className="w-full mb-8">
          <div className="w-full rounded-2xl bg-gradient-to-b from-white/95 to-white/90 border border-gray-100 shadow-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="relative w-[120px] h-[120px] flex-shrink-0">
                <Image
                  src={user.imageUrl || "/avatar-placeholder.png"}
                  alt={user.firstName ?? "User"}
                  width={120}
                  height={120}
                  className="rounded-full border-[6px] border-white shadow-lg object-cover"
                />
                <span
                  aria-hidden
                  className="absolute -inset-1 rounded-full pointer-events-none bg-gradient-to-r from-orange-200 via-orange-300 to-pink-200 opacity-25 blur-[14px] animate-[pulse_3s_infinite]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-pink-500">
                    {user.firstName} {user.lastName}
                  </span>
                </h1>
                <div className="text-sm text-muted-foreground">
                  {user.emailAddresses?.[0]?.emailAddress ?? ""}
                </div>

                <div className="flex gap-3 mt-4 items-stretch">
                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                      <img src="/icons/check.svg" alt="lessons" width={18} height={18} />
                      <div>
                        <div className="text-xl font-bold">{lessonsCompleted}</div>
                        <div className="text-sm text-muted-foreground">Lessons completed</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                      <img src="/icons/cap.svg" alt="created" width={18} height={18} />
                      <div>
                        <div className="text-xl font-bold">{companionsCreated}</div>
                        <div className="text-sm text-muted-foreground">Companions created</div>
                      </div>
                    </div>
                  </div>

                  {/* CreditsCard: render as a self-contained component to avoid broken inline svg/text */}
                  <div className="bg-white rounded-xl p-0 shadow-sm border border-gray-100" data-credit-card="true">
                    <CreditsCard />
                  </div>
                </div>
              </div>
            </div>

            {/* Right-side actions */}
            <aside className="flex flex-col items-end gap-3 w-full md:w-auto">
              <div className="text-sm text-muted-foreground">Quick Actions</div>
              <div className="flex gap-3">
                <Link
                  href="/companions"
                  className="px-5 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold shadow-lg hover:scale-[1.02] transition-transform"
                >
                  Browse Companions
                </Link>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition"
                >
                  Go Home
                </Link>
              </div>
            </aside>
          </div>
        </header>

        {/* ACCORDIONS */}
        <section className="space-y-4">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="bookmarks">
              <AccordionTrigger className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition">
                <div>
                  <div className="text-lg font-semibold">Bookmarked Companions</div>
                  <div className="text-sm text-muted-foreground">{bookmarkedCompanions.length} saved</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-transparent">
                <CompanionsList companions={bookmarkedCompanions} title="Bookmarked Companions" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="recent">
              <AccordionTrigger className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition">
                <div>
                  <div className="text-lg font-semibold">Recent Sessions</div>
                  <div className="text-sm text-muted-foreground">{uniqueSessions.length} sessions</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-transparent">
                <div className="mb-3 text-sm text-muted-foreground">Your recent activity — quick access to saved notes & transcripts</div>
                <div className="w-full">
                  <RecentSessionsClient sessions={uniqueSessions} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="companions">
              <AccordionTrigger className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition">
                <div>
                  <div className="text-lg font-semibold">My Companions</div>
                  <div className="text-sm text-muted-foreground">{companions.length} created</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 bg-transparent">
                <CompanionsList title="My Companions" companions={companions} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* helper client that wires "Take me there" actions */}
        <TakeMeThereClient />
      </main>
    </>
  );
};

export default Profile;
