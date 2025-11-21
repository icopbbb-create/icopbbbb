// app/sign-in/[[...rest]]/page.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { SignIn } from "@clerk/nextjs";

export default function SignInPageCatchAll() {
  // Hide navbar on this page (safety).
  useEffect(() => {
    const nav = document.querySelector("nav.navbar") as HTMLElement | null;
    if (nav) nav.style.display = "none";
    return () => {
      if (nav) nav.style.display = "";
    };
  }, []);

  // IMPORTANT: send Clerk back to the server-side handler so the handshake completes.
  // after-signin will route pro users -> interactive-logo-app (vite SPA) and free users -> /edu-logo.
  const redirectUrl = useMemo(() => {
    return `/after-signin`;
  }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-white"
      style={{
        transform: "translate(6vw, -12vh)",
        WebkitTransform: "translate(6vw, -12vh)",
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Clerk sign-in: routing="path" for consistent redirect/handshake behavior */}
        <SignIn routing="path" redirectUrl={redirectUrl} />
      </div>
    </div>
  );
}
