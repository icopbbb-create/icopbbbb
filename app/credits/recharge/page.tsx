// app/credits/recharge/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function RechargePage() {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [requestedCredits, setRequestedCredits] = useState<number>(120);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; id?: string; error?: string } | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.emailAddresses?.[0]?.emailAddress ?? "");
      setName(user.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user.fullName ?? "");
    }
  }, [user]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setResult(null);

    if (!email || !requestedCredits || requestedCredits <= 0) {
      setResult({ ok: false, error: "Please provide a valid email and credits amount." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/credits/recharge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          requested_credits: Number(requestedCredits),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setResult({ ok: true, id: json.id });
      } else {
        setResult({ ok: false, error: json?.error || "Request failed" });
      }
    } catch (err: any) {
      setResult({ ok: false, error: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-start justify-center py-12 px-4 bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-2">Recharge Credits</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Fill the form and submit. You'll get a QR placeholder and a request id — admin will verify and top up credits manually.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
              placeholder="you@example.com"
              type="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
              placeholder="+91 98765 43210"
              type="tel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Credits to purchase</label>
            <select
              value={requestedCredits}
              onChange={(e) => setRequestedCredits(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm p-2"
            >
              <option value={120}>120 credits</option>
              <option value={300}>300 credits</option>
              <option value={600}>600 credits</option>
              <option value={1200}>1200 credits</option>
              <option value={2400}>2400 credits</option>
            </select>
          </div>

          <div className="flex gap-3 items-center">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-orange-500 text-white rounded-md font-semibold disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              className="px-3 py-2 border rounded-md"
              onClick={() => router.push("/my-journey")}
            >
              Cancel
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-6">
            {result.ok ? (
              <div className="p-4 rounded-md border bg-green-50">
                <div className="font-semibold">Request submitted</div>
                <div className="text-sm">Request ID: <code>{result.id}</code></div>

                <div className="mt-4">
                  <div className="mb-2 text-sm">QR for payment (placeholder):</div>
                  <div className="w-48 h-48 bg-gray-100 rounded-md flex items-center justify-center">
                    <div className="text-xs text-muted-foreground">QR CODE</div>
                  </div>
                </div>

                <div className="mt-3 text-sm">
                  Admin will verify and top up credits manually. We'll keep you updated.
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-md border bg-red-50 text-red-700">
                {result.error || "Failed to submit request"}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
