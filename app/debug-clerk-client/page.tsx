// app/debug-clerk-client/page.tsx
"use client";
import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";

export default function DebugClerkClient() {
  const { user, isSignedIn } = useUser();
  const auth = useAuth();

  useEffect(() => {
    console.log("[debug-clerk-client] isSignedIn:", isSignedIn);
    console.log("[debug-clerk-client] user:", user);
    console.log("[debug-clerk-client] auth.userId:", auth.userId);
    console.log("[debug-clerk-client] has getToken():", typeof auth.getToken === "function");
    console.log("[debug-clerk-client] document.cookie:", document.cookie);
  }, [isSignedIn, user, auth]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Clerk client debug</h2>
      <p>Open DevTools console — it prints client auth state and cookies.</p>
      <pre id="dbg">
        {JSON.stringify({ isSignedIn, userId: auth.userId, cookie: typeof document !== "undefined" ? document.cookie : "" }, null, 2)}
      </pre>
    </div>
  );
}
