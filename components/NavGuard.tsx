// components/NavGuard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * NavGuard:
 * - If user is signed in => render children (full Navbar)
 * - If user is NOT signed in and on landing routes => render a minimal header:
 *     [logo]                                [Sign in]
 * - Otherwise => render children
 *
 * This avoids hiding the logo or sign-in button on the landing page while still
 * preventing the full nav links from appearing for unsigned users.
 */

export default function NavGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { isSignedIn } = useUser();

  // routes where we want the minimal header for *unsigned* visitors
  const hideFullNavRoutes = ["/", "/landing", "/landing/"];

  const isLandingRoute = hideFullNavRoutes.some((r) => pathname === r || pathname.startsWith(r));

  // if user is signed in: always show the full navbar
  if (isSignedIn) return <>{children}</>;

  // user not signed in + on landing route: show minimal header (logo + sign-in CTA)
  if (!isSignedIn && isLandingRoute) {
    return (
      <header className="w-full bg-transparent">
        <div className="max-w-[1200px] mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" aria-label="Edu Voice Home" className="flex items-center gap-3">
            {/* Use next/image where possible; falls back to img if build issues */}
            <Image src="/images/logo.png" alt="Edu Voice Agent" width={44} height={44} className="rounded-full" />
            <span className="text-xl font-extrabold text-orange-600">Edu Voice Agent</span>
          </Link>

          <div>
            <Link
              href="/sign-in"
              className="inline-block px-4 py-2 rounded-full bg-white text-orange-600 font-semibold shadow-sm border border-orange-100"
              aria-label="Sign in"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // default: show the full navbar
  return <>{children}</>;
}
