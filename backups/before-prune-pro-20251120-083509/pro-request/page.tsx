// app/pro-request/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * Public Pro Request page (no Clerk)
 *
 * - Users submit an email/username to request Pro access.
 * - "Subscribe now" POSTs to /api/pro-request/public
 * - If the user's request is already approved, they are redirected to the interactive logo app.
 *
 * Admin mode (simple password-guarded UI):
 * - Enter admin password to fetch pending requests and approve/reject them via /api/pro-request/approve-with-password.
 *
 * Note: keep server-side approval logic secure; this admin UI uses a password header to interact with the admin endpoint.
 */

export default function ProRequestPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"user" | "admin">("user");

  // user form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fakePassword, setFakePassword] = useState(""); // for record only
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // admin state
  const [adminPassword, setAdminPassword] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [pending, setPending] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    // No-op on mount; keep lightweight.
  }, []);

  // --- User flows ---

  async function handleSubscribeNow(e?: React.FormEvent) {
    e?.preventDefault();
    setMessage(null);

    if (!email || !username) {
      setMessage("Please enter both username and email.");
      return;
    }

    setLoading(true);
    try {
      // Check existing status first
      const statusRes = await fetch(`/api/pro-request/status?email=${encodeURIComponent(email)}`, {
        credentials: "include",
      });
      const statusJson = await statusRes.json().catch(() => ({}));
      if (statusRes.ok && statusJson?.ok && statusJson?.request) {
        const req = statusJson.request;
        if (req.status === "approved") {
          // Approved -> redirect to interactive logo app which will then redirect to home
          router.push("/interactive-logo?redirect=/home");
          return;
        }
      }

      // Create/upsert request
      const res = await fetch("/api/pro-request/public", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password_hint: fakePassword ? "[provided]" : null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setMessage("Response sent to admin — please wait for approval.");
      } else {
        console.error("create public request failed", json);
        const errMsg =
          json?.error || json?.details || (json && JSON.stringify(json)) || `HTTP ${res.status}`;
        setMessage("Failed to create request: " + errMsg);
      }
    } catch (err) {
      console.error("subscribe error", err);
      setMessage("Something went wrong. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  // quick status check by email
  async function handleCheckStatus() {
    if (!email) {
      setMessage("Enter your email to check status");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/pro-request/status?email=${encodeURIComponent(email)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok && json?.request) {
        if (json.request.status === "approved") {
          router.push("/interactive-logo?redirect=/home");
          return;
        } else {
          setMessage("Your request is pending — please wait for admin approval.");
        }
      } else {
        setMessage("No request found. Click Subscribe now to create a request.");
      }
    } catch (err) {
      console.error("check status error", err);
      setMessage("Failed to check status.");
    } finally {
      setLoading(false);
    }
  }

  // --- Admin flows ---

  async function handleAdminLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setMessage(null);
    if (!adminPassword) {
      setMessage("Enter admin password");
      return;
    }

    setAdminLoading(true);
    try {
      const res = await fetch("/api/pro-request/approve-with-password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", adminPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setAdminAuthenticated(true);
        await loadPending(adminPassword);
        setMessage(null);
      } else {
        console.warn("admin verify failed", json);
        setAdminAuthenticated(false);
        const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
        setMessage("Admin password incorrect: " + errMsg);
      }
    } catch (err) {
      console.error("admin verify err", err);
      setMessage("Admin verify failed");
    } finally {
      setAdminLoading(false);
    }
  }

  async function loadPending(adminPw?: string) {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/pro-request/approve-with-password", {
        method: "GET",
        credentials: "include",
        headers: { "x-admin-password": adminPw || adminPassword },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setPending(Array.isArray(json.pending) ? json.pending : []);
      } else {
        setPending([]);
        const errMsg = json?.error || json?.message || `HTTP ${res.status}`;
        setMessage("Failed to load pending: " + errMsg);
      }
    } catch (err) {
      console.error("loadPending err", err);
      setPending([]);
      setMessage("Failed to load pending requests");
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleApprove(proRequestId: string, requesterEmail: string | null = null) {
    if (!confirm("Approve this request and grant 1200 credits?")) return;
    setAdminLoading(true);
    try {
      const res = await fetch("/api/pro-request/approve-with-password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          adminPassword,
          proRequestId,
          email: requesterEmail,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setPending((p) => p.filter((r) => r.id !== proRequestId));
        alert("Approved successfully");
      } else {
        console.error("approve failed", json);
        const errMsg = json?.error || json?.details || json?.message || (json && JSON.stringify(json)) || `HTTP ${res.status}`;
        alert("Approve failed: " + errMsg);
      }
    } catch (err) {
      console.error("approve err", err);
      alert("Approve failed: network error");
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleReject(proRequestId: string) {
    if (!confirm("Reject this request?")) return;
    setAdminLoading(true);
    try {
      const res = await fetch("/api/pro-request/approve-with-password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          adminPassword,
          proRequestId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setPending((p) => p.filter((r) => r.id !== proRequestId));
        alert("Rejected");
      } else {
        console.error("reject failed", json);
        const errMsg = json?.error || json?.details || json?.message || (json && JSON.stringify(json)) || `HTTP ${res.status}`;
        alert("Reject failed: " + errMsg);
      }
    } catch (err) {
      console.error("reject err", err);
      alert("Reject failed: network error");
    } finally {
      setAdminLoading(false);
    }
  }

  // UI
  return (
    <div className="min-h-screen py-12 px-6" style={{ background: "linear-gradient(180deg,#071018,#03060a)" }}>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-start">
        {/* Left: marketing */}
        <div className="text-left text-amber-200 p-6">
          <div className="mb-6">
            <div className="inline-block rounded p-2 bg-amber-400/10">
              <Image src="/images/logo.png" alt="logo" width={120} height={120} />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4 text-amber-300">Edu Voice Agent — Pro Access</h1>
          <p className="mb-4 text-amber-100/80">
            Pro grants 1200 credits on approval, priority support, and more active companions.
            Requests are manually reviewed by admin.
          </p>

          <ul className="text-amber-100/70 space-y-2">
            <li>• 1200 credits on approval</li>
            <li>• Priority support</li>
            <li>• More active companions</li>
          </ul>
        </div>

        {/* Right: forms */}
        <div className="p-6">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-100">Pro Request</h2>
              <div className="text-sm">
                <button
                  onClick={() => {
                    setMode(mode === "user" ? "admin" : "user");
                    setMessage(null);
                  }}
                  className="text-xs underline text-amber-200"
                >
                  {mode === "user" ? "Switch to admin" : "Switch to user"}
                </button>
              </div>
            </div>

            {mode === "user" && (
              <form onSubmit={handleSubscribeNow} className="space-y-4">
                <div>
                  <label className="block text-sm text-amber-100/80">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 w-full rounded px-3 py-2 bg-black/20 border border-amber-200/10 text-white"
                    placeholder="Enter a display name"
                  />
                </div>

                <div>
                  <label className="block text-sm text-amber-100/80">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded px-3 py-2 bg-black/20 border border-amber-200/10 text-white"
                    placeholder="you@example.com"
                    type="email"
                  />
                </div>

                <div>
                  <label className="block text-sm text-amber-100/80">Password (for your record)</label>
                  <input
                    value={fakePassword}
                    onChange={(e) => setFakePassword(e.target.value)}
                    className="mt-1 w-full rounded px-3 py-2 bg-black/20 border border-amber-200/10 text-white"
                    placeholder="You can enter a password (not used to log in)"
                    type="password"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded bg-amber-500 text-white font-semibold disabled:opacity-60"
                  >
                    {loading ? "Please wait…" : "Subscribe now"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckStatus}
                    className="px-3 py-2 rounded border border-amber-200 text-amber-100"
                  >
                    Check status
                  </button>
                </div>

                {message && <div className="text-amber-100/90 mt-2">{message}</div>}
              </form>
            )}

            {mode === "admin" && (
              <div>
                {!adminAuthenticated ? (
                  <form onSubmit={handleAdminLogin} className="space-y-3">
                    <div>
                      <label className="block text-sm text-amber-100/80">Admin password</label>
                      <input
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="mt-1 w-full rounded px-3 py-2 bg-black/20 border border-amber-200/10 text-white"
                        type="password"
                        placeholder="Enter admin password"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={adminLoading} className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-60">
                        {adminLoading ? "Checking…" : "Sign in as admin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("user");
                          setAdminAuthenticated(false);
                        }}
                        className="px-3 py-2 rounded border border-amber-200 text-amber-100"
                      >
                        Back to user
                      </button>
                    </div>
                    {message && <div className="text-amber-100/90 mt-2">{message}</div>}
                  </form>
                ) : (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm text-amber-100">Admin panel — pending requests</div>
                      <div>
                        <button
                          onClick={() => {
                            setAdminAuthenticated(false);
                            setAdminPassword("");
                          }}
                          className="px-3 py-1 border rounded text-amber-100"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {adminLoading && <div className="text-sm text-amber-100">Loading…</div>}
                      {!adminLoading && pending.length === 0 && <div className="text-sm text-amber-100">No pending requests</div>}

                      {pending.map((r) => (
                        <div key={r.id} className="p-3 bg-black/20 rounded flex items-start justify-between">
                          <div>
                            <div className="text-amber-200 font-medium">{r?.metadata?.username ?? r.username}{" "}<span className="text-xs text-amber-100">({r.email})</span></div>
                            <div className="text-sm text-amber-100/80">Requested at: {new Date(r.requested_at).toLocaleString()}</div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleApprove(r.id, r.email)}
                              className="px-3 py-1 rounded bg-emerald-600 text-white"
                              disabled={adminLoading}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(r.id)}
                              className="px-3 py-1 rounded border text-amber-100"
                              disabled={adminLoading}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button onClick={() => loadPending(adminPassword)} className="px-3 py-1 rounded border text-amber-100" disabled={adminLoading}>
                        Refresh
                      </button>
                      <button
                        onClick={() => {
                          fetch("/api/pro-request/debug", { credentials: "include" })
                            .then((r) => r.json())
                            .then((j) => {
                              console.log("debug:", j);
                              alert("Debug output logged to console (open devtools).");
                            })
                            .catch((e) => {
                              console.error("debug call failed", e);
                              alert("Debug call failed (check console).");
                            });
                        }}
                        className="px-3 py-1 rounded border text-amber-100"
                      >
                        Debug
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
