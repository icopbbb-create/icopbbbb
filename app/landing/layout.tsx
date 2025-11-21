// app/landing/layout.tsx
import React from "react";
import type { ReactNode } from "react";

export const metadata = {
  title: "Edu Voice — Welcome",
  description: "Edu Voice Agent — voice-first learning",
};

/**
 * Landing layout: this is a nested layout for the landing section.
 * IMPORTANT: do NOT render <html> or <body> here — the root layout handles that.
 * Keep the landing layout minimal and free of global nav so public users see only landing content.
 */
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
