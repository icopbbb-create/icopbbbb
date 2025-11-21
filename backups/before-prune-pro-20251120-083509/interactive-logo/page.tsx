// app/interactive-logo/page.tsx
// Server-side forward to the Vite-built interactive logo SPA.
// When a pro user lands at /interactive-logo we immediately forward them
// to /interactive-logo-app?redirect=/home so they see the Vite-built experience.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function InteractiveLogoForward() {
  // Server-side redirect — this halts render and sends a 3xx redirect response.
  redirect("/interactive-logo-app?redirect=/home");

  // never reached, but keep a fallback return shape for clarity
  return null;
}
