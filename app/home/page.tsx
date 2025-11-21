// app/home/page.tsx
import React from "react";
import CTA from "@/components/Cta";

/**
 * Minimal /home page.
 * This page intentionally mirrors the main workspace "welcome" CTA so
 * /home will show the same entry card if some flows navigate to /home.
 *
 * Keep this server component simple and avoid client-only Clerk imports here.
 */
export default function HomePage() {
  return (
    <main className="px-8 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="welcome-banner mb-8">
          <h1 className="text-4xl font-extrabold mb-2">Welcome to your Dashboard</h1>
          <p className="text-gray-600">
            You've successfully entered the Edu Voice Agent workspace.
          </p>
        </div>

        {/* Central CTA card (same component used in root) */}
        <div className="center-cta mb-8">
          <div className="center-cta-inner">
            <CTA />
          </div>
        </div>

        {/* Brief guidance text */}
        <section className="mt-6">
          <div className="rounded-lg bg-white shadow p-6 border">
            <p className="text-gray-700">
              This is the workspace 'home' — use the top navigation to open Companions, My Journey, or Profile.
              Start a session from Companions → Start Session. View transcripts and AI notes in My Journey.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
