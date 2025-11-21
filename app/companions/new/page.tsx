// app/companions/new/page.tsx
import CompanionForm from "@/components/CompanionForm";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { newCompanionPermissions } from "@/lib/server/companion.actions";
import Image from "next/image";
import Link from "next/link";

// QuickPromptsClient must be a client component (starts with "use client")
import QuickPromptsClient from "@/components/QuickPromptsClient";

const colorCycle = [
  "#FF6B35",
  "#FF9A3C",
  "#FFD166",
  "#6CE3D5",
  "#6EB5FF",
  "#B58CFF",
  "#FF7AB6",
];

function glowSpans(text: string) {
  // produce spans so each letter can animate in a staggered way
  return Array.from(text).map((ch, i) => {
    const color = colorCycle[i % colorCycle.length];
    return (
      <span
        key={`${ch}-${i}`}
        className="glow-letter"
        style={
          {
            ["--glow-color" as any]: color,
            ["--delay" as any]: `${i * 60}ms`,
          } as React.CSSProperties
        }
      >
        {ch === " " ? "\u00A0" : ch}
      </span>
    );
  });
}

const NewCompanion = async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const canCreateCompanion = await newCompanionPermissions();

  return (
    <main className="min-h-screen bg-background/60 py-12">
      <style>{`
        /* Header & letter glow */
        .glow-header { text-align: center; margin-bottom: 14px; }
        .glow-header h1 { font-size: 2.5rem; font-weight: 800; line-height: 1.05; }
        .glow-sub { margin-top: 8px; color: #475569; max-width: 900px; margin-left:auto;margin-right:auto; }
        .glow-letter {
          display:inline-block;
          font-weight:700;
          transition: transform .28s ease, text-shadow .28s ease, color .28s ease;
          animation: floatGlow 2000ms cubic-bezier(.2,.9,.2,1) infinite;
          animation-delay: var(--delay);
          color: #0f172a;
          text-shadow: 0 0 0 rgba(0,0,0,0);
        }
        @keyframes floatGlow {
          0% { transform: translateY(0); text-shadow: 0 0 0 rgba(0,0,0,0); }
          40% { transform: translateY(-6px); text-shadow: 0 8px 28px rgba(0,0,0,0.06); }
          80% { transform: translateY(0); text-shadow: 0 0 0 rgba(0,0,0,0); }
        }
        .glow-letter:hover {
          transform: translateY(-10px) scale(1.05);
          text-shadow: 0 16px 48px rgba(0,0,0,0.12);
          color: var(--glow-color);
        }

        /* floating card */
        .card-float {
          border-radius: 18px;
          transform-origin: center;
          animation: cardFloat 6s ease-in-out infinite;
          will-change: transform, filter;
        }
        @keyframes cardFloat {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.01); }
          100% { transform: translateY(0) scale(1); }
        }

        /* nicer submit glow */
        .build-btn {
          background: linear-gradient(90deg,#ff7a3a,#fe5933);
          box-shadow: 0 12px 36px rgba(254,89,51,0.14), 0 4px 12px rgba(0,0,0,0.06) inset;
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .build-btn:hover { transform: translateY(-3px); box-shadow: 0 22px 56px rgba(254,89,51,0.18); }
      `}</style>

      <div className="mx-auto max-w-[1100px] px-6">
        <header className="glow-header">
          <h1 className="mb-2">
            {glowSpans("Create a learning companion tailored to your needs")}
          </h1>
          <p className="glow-sub text-sm">
            Choose subject, voice, style and a guided prompt — then hit build to create an interactive lesson companion.
          </p>
        </header>

        {canCreateCompanion ? (
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8">
              <div className="card-float rounded-2xl bg-white/90 border border-gray-100 shadow-lg p-6 sm:p-8">
                {/* CompanionForm is a client component (handles selects and form state) */}
                <CompanionForm />
              </div>
            </div>

            <aside className="md:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-xl bg-gradient-to-br from-white to-white/95 border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold mb-2">Quick Tips</h3>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Pick a concise companion name (e.g. “Math Tutor”).</li>
                    <li>Use the topic field for focused goals (ex. “Derivatives & Integrals”).</li>
                    <li>Try durations between 10–20 minutes for practice sessions.</li>
                  </ul>
                </div>

                {/* QuickPromptsClient is a client component that copies prompts to clipboard */}
                <QuickPromptsClient />

                {/* removed the "Need more companions / Upgrade" block as requested */}
              </div>
            </aside>
          </section>
        ) : (
          <article className="max-w-3xl mx-auto rounded-2xl border border-gray-100 bg-white p-8 shadow-lg text-center">
            <div className="mb-6">
              <Image src="/images/limit.svg" alt="Companion limit reached" width={360} height={220} />
            </div>

            <h3 className="text-2xl font-bold mb-2">You’ve Reached Your Limit</h3>
            <p className="text-muted-foreground mb-6">
              You’ve reached your companion limit. Upgrade to create more companions and access premium voices & features.
            </p>

            <div className="flex gap-3 justify-center">
              <Link href="/subscription" className="btn-primary w-full sm:w-auto justify-center">
                Upgrade My Plan
              </Link>

              <Link href="/" className="btn-ghost w-full sm:w-auto justify-center">
                Back to Home
              </Link>
            </div>
          </article>
        )}
      </div>
    </main>
  );
};

export default NewCompanion;
