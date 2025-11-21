// app/admin/pro-requests/page.tsx
import React from "react";
import { getSupabaseServer } from "@/lib/supabase-server";
import { safeCurrentUser } from "@/lib/safeCurrentUser";

/**
 * Admin: Pending Pro Requests
 *
 * Server-rendered page that lists pending pro_requests and provides an "Approve" button for each.
 * - Protects the page by verifying the current user is an admin (ADMIN_CLERK_USER_ID(S) env var).
 * - Renders a minimal client-side "Approve" handler via a small inline script that calls the
 *   PATCH /api/pro-request/approve route with JSON.
 *
 * Notes:
 * - This is intentionally minimal to avoid creating extra client components/files.
 * - Make sure ADMIN_CLERK_USER_ID or ADMIN_CLERK_USER_IDS (comma-separated) is set in env.
 * - The approve endpoint must exist at: app/api/pro-request/approve/route.ts (we produced it earlier).
 */

const ADMIN_IDS = (() => {
  const env = process.env.ADMIN_CLERK_USER_IDS || process.env.ADMIN_CLERK_USER_ID || "";
  return env.split(",").map((s) => s.trim()).filter(Boolean);
})();

export default async function AdminProRequestsPage() {
  const admin = await safeCurrentUser();
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-2xl font-semibold mb-2">Unauthorized</h1>
          <p className="text-sm text-gray-600">You must be signed in as an admin to view this page.</p>
        </div>
      </div>
    );
  }

  if (!ADMIN_IDS.includes(admin.id)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-2xl font-semibold mb-2">Forbidden</h1>
          <p className="text-sm text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const supabase = getSupabaseServer();
  const { data: rows, error } = await supabase
    .from("pro_requests")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch pro_requests:", error);
  }

  // Server-side rendered HTML. We add a tiny inline script at the bottom to wire Approve buttons.
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Pending Pro Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Approve user requests to grant them Pro (1200 credits).</p>
        </header>

        <main>
          {(!rows || rows.length === 0) && (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center">
              <p className="text-gray-700">No pending requests right now.</p>
            </div>
          )}

          {rows && rows.length > 0 && (
            <ul className="space-y-4">
              {rows.map((r: any) => (
                <li
                  key={r.id}
                  className="bg-white border rounded-lg p-4 flex items-start justify-between gap-4 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-slate-900">{r.email}</div>
                      <div className="text-xs text-gray-500">• requested {new Date(r.requested_at).toLocaleString()}</div>
                    </div>

                    {r.message && <div className="mt-2 text-sm text-gray-700">{r.message}</div>}

                    <div className="mt-3 text-xs text-gray-500">
                      ID: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{r.id}</code>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      data-prorequest-id={r.id}
                      data-user-id={r.user_id}
                      className="approve-btn inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm"
                    >
                      Approve
                    </button>

                    <button
                      data-prorequest-id={r.id}
                      className="reject-btn inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-md text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Approving will call the admin API which updates the request status and sets the user's plan to <code>pro</code>{" "}
            with <strong>1200 credits</strong>. Use caution — this action cannot be easily undone.
          </p>
        </div>
      </div>

      {/* Inline client-side script to handle Approve / Reject actions via fetch.
          This avoids creating an extra client component file while keeping admin UX interactive.
          The script looks for buttons with class .approve-btn and .reject-btn and calls the
          existing API endpoints:
            PATCH /api/pro-request/approve  (body: { proRequestId, userId })
            PATCH /api/pro-request/reject   (optional; not implemented server-side here)
      */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              function handleError(msg, detail) {
                console.error(msg, detail);
                alert('Action failed: ' + (msg || 'unknown error'));
              }

              async function approve(proRequestId, userId, btn) {
                if (!confirm('Approve this request and grant 1200 credits to the user?')) return;
                btn.disabled = true;
                const originalText = btn.innerText;
                btn.innerText = 'Approving...';
                try {
                  const res = await fetch('/api/pro-request/approve', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proRequestId: proRequestId, userId: userId })
                  });
                  const json = await res.json();
                  if (!res.ok || !json?.ok) {
                    handleError('Approve API returned error', json || res.status);
                    btn.disabled = false;
                    btn.innerText = originalText;
                    return;
                  }
                  // remove the list item from DOM
                  const li = btn.closest('li');
                  if (li) {
                    li.style.transition = 'opacity 220ms ease, height 240ms ease';
                    li.style.opacity = '0';
                    setTimeout(() => li.remove(), 260);
                  } else {
                    // fallback: reload page
                    window.location.reload();
                  }
                } catch (err) {
                  handleError('Network error', err);
                  btn.disabled = false;
                  btn.innerText = originalText;
                }
              }

              async function reject(proRequestId, btn) {
                if (!confirm('Reject this request?')) return;
                btn.disabled = true;
                const originalText = btn.innerText;
                btn.innerText = 'Rejecting...';
                try {
                  // If you want to implement reject server-side, create an endpoint.
                  // For now we'll just mark visually removed and optionally call the approve endpoint with status 'rejected'
                  const res = await fetch('/api/pro-request/approve', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proRequestId: proRequestId, userId: null, action: 'reject' })
                  });
                  const json = await res.json();
                  if (!res.ok || !json?.ok) {
                    handleError('Reject API returned error', json || res.status);
                    btn.disabled = false;
                    btn.innerText = originalText;
                    return;
                  }
                  const li = btn.closest('li');
                  if (li) {
                    li.style.transition = 'opacity 220ms ease, height 240ms ease';
                    li.style.opacity = '0';
                    setTimeout(() => li.remove(), 260);
                  } else {
                    window.location.reload();
                  }
                } catch (err) {
                  handleError('Network error', err);
                  btn.disabled = false;
                  btn.innerText = originalText;
                }
              }

              document.addEventListener('click', function (e) {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;

                const approveBtn = target.closest('.approve-btn');
                if (approveBtn) {
                  const prId = approveBtn.getAttribute('data-prorequest-id');
                  const userId = approveBtn.getAttribute('data-user-id');
                  if (prId && userId) {
                    approve(prId, userId, approveBtn);
                  } else {
                    alert('Missing proRequestId or userId');
                  }
                  return;
                }

                const rejectBtn = target.closest('.reject-btn');
                if (rejectBtn) {
                  const prId = rejectBtn.getAttribute('data-prorequest-id');
                  if (prId) {
                    reject(prId, rejectBtn);
                  } else {
                    alert('Missing proRequestId');
                  }
                  return;
                }
              });
            })();
          `,
        }}
      />
    </div>
  );
}
