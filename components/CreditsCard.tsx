// components/CreditsCard.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type Credits = {
  credits_remaining: number;
  credits_used: number;
  plan: string;
  blocked: boolean;
};

export default function CreditsCard() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);
  const [animValue, setAnimValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const fetchCredits = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/credits/me");
        if (!res.ok) {
          setCredits(null);
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (!mounted) return;
        setCredits({
          credits_remaining: Number(json.credits_remaining ?? 0),
          credits_used: Number(json.credits_used ?? 0),
          plan: json.plan ?? "free",
          blocked: Boolean(json.blocked ?? false),
        });
        setLoading(false);
      } catch (e) {
        setCredits(null);
        setLoading(false);
      }
    };

    fetchCredits();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Animate credit usage count
  useEffect(() => {
    if (!credits) return;
    const target = credits.credits_used;
    const duration = 700;
    const start = performance.now();
    const from = 0;

    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      setAnimValue(Math.round(from + (target - from) * eased));

      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [credits]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 w-full max-w-xs">
        <div className="text-sm text-muted-foreground">Loading credits…</div>
      </div>
    );
  }

  if (!credits) {
    return (
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 w-full max-w-xs">
        <div className="text-sm text-muted-foreground">Credits unavailable</div>
        <div className="mt-2">
          <Button size="sm" onClick={() => router.push("/sign-in")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  // === NEW: sensible mapping for total limits ===
  // Free users: 50 credits (default)
  // Pro users: 1200 credits (adjust if you want a different pro amount)
  const totalLimit = credits.plan === "pro" ? 1200 : 50;

  const used = credits.credits_used;
  const remaining = credits.credits_remaining;
  const progress = Math.max(0, Math.min(1, used / Math.max(1, totalLimit)));
  const initials = "CR"; // Static initials avatar

  // low-credit threshold in UI (same as your requirement)
  const LOW_THRESHOLD = 15;

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start gap-4"
      style={{ minWidth: 360 }}
      aria-live="polite"
    >
      {/* Avatar Bubble */}
      <div
        className="flex-shrink-0 inline-flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          background: "linear-gradient(135deg,#fff6e8,#ff8a4b)",
          boxShadow: "0 6px 14px rgba(16,24,40,0.06)",
          border: "1px solid rgba(15,23,42,0.03)",
          fontWeight: 800,
          color: "#7a3414",
          fontSize: 14,
        }}
        aria-hidden
      >
        <span>{initials}</span>
      </div>

      <div style={{ flex: 1 }}>
        <div className="text-sm text-muted-foreground">Credits</div>
        <div className="text-lg font-bold leading-tight">
          {remaining.toLocaleString()}{" "}
          <span className="text-sm font-medium text-muted-foreground">remaining</span>
        </div>

        <div className="mt-3">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg,#ff7a3a,#fe5933)",
                transition: "width 300ms ease",
              }}
              className="h-2 rounded-full"
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {animValue.toLocaleString()} used out of {totalLimit.toLocaleString()}
          </div>
        </div>

        <div className="mt-3 flex">
          <Button
            size="sm"
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-white"
            onClick={() => router.push("/subscription/pro")}
          >
            Upgrade / Recharge
          </Button>

          {/* Removed "Recharge manually" link per request - only one CTA remains */}
        </div>

        {/* Inline small warning inside the card for quick visibility (shows only when low) */}
        {remaining <= LOW_THRESHOLD && !credits.blocked && (
          <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700 shadow-sm">
            <span role="img" aria-hidden>
              ⚠️
            </span>{" "}
            <strong className="font-semibold">You are running low on credits.</strong> Recharge soon.
          </div>
        )}

        {credits.blocked && (
          <div className="mt-3 text-sm text-red-600">
            Your account is blocked due to exhausted credits. Please recharge or contact admin.
          </div>
        )}
      </div>
    </div>
  );
}
