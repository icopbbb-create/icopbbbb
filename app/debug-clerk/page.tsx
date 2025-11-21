// app/debug-clerk/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export default function DebugClerkPage() {
  const { isLoaded, userId, sessionId, getToken } = useAuth();
  const { isSignedIn, user } = useUser();
  const [docCookies, setDocCookies] = useState<string>("");

  useEffect(() => {
    try {
      setDocCookies(document.cookie);
    } catch {
      setDocCookies("(cannot read document.cookie)");
    }
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h2>Clerk Debug</h2>

      <section style={{ marginTop: 12 }}>
        <strong>Client runtime loaded:</strong> {String(isLoaded)} <br />
        <strong>Client user signed in (useUser):</strong> {String(isSignedIn)} <br />
        <strong>Client user id (useAuth.userId):</strong> {String(userId)} <br />
        <strong>Client session id:</strong> {String(sessionId)} <br />
        <strong>Client user object id:</strong> {user?.id ?? "null"} <br />
      </section>

      <section style={{ marginTop: 12 }}>
        <strong>Document.cookie</strong>
        <pre style={{ padding: 10, background: "#111", color: "#fff", borderRadius: 6, overflowX: "auto" }}>
          {docCookies}
        </pre>
      </section>

      <section style={{ marginTop: 12 }}>
        <button
          onClick={async () => {
            try {
              const token = await getToken?.();
              alert("getToken(): " + (token ?? "(no token)"));
            } catch (err) {
              alert("getToken() error: " + String(err));
            }
          }}
        >
          getToken() (client)
        </button>
      </section>

      <p style={{ marginTop: 12, color: "orange" }}>
        Notes: you should see a non-empty <code>__client_uat</code> cookie and `isSignedIn` true after signing in.
      </p>
    </div>
  );
}
