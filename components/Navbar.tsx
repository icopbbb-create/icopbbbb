// components/Navbar.tsx
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import NavItems from './NavItems';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const ClerkUserButton = dynamic(
  () => import('@clerk/nextjs').then((m) => m.UserButton),
  { ssr: false }
);
const SignInButton = dynamic(
  () => import('@clerk/nextjs').then((m) => m.SignInButton),
  { ssr: false }
);

export default function Navbar() {
  const pathname = usePathname();
  const [credits, setCredits] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCredits = async () => {
      try {
        const res = await fetch('/api/credits/me');
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;
        setCredits(Number(json.credits_remaining ?? null));
        setBlocked(Boolean(json.blocked ?? false));
      } catch {
        // ignore errors silently
      }
    };
    fetchCredits();
    // refresh on focus
    const onFocus = () => fetchCredits();
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Hide navbar only on explicit public/entry pages.
  // DO NOT hide on "/" — when the server identifies a signed-in user,
  // the root should show the app navbar.
  const hideOn = [
    '/landing',
    '/sign-in',
    '/pro-request',
    '/interactive-logo',
    '/interactive-logo-app',
    '/edu-logo',
  ];

  if (typeof pathname === 'string' && hideOn.some((p) => pathname === p || pathname.startsWith(p))) {
    return null;
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation" style={{ zIndex: 60 }}>
      <div className="nav-left">
        <Link href="/" className="logo inline-flex items-center gap-3" aria-label="Edu Voice Agent Home">
          <img src="/images/logo.png" alt="Edu Voice Agent" className="h-9 w-auto" />
        </Link>
      </div>

      <div className="nav-right" style={{ alignItems: 'center' }}>
        <div className="nav-links">
          <NavItems />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Credits badge */}
          <div title={blocked ? 'Account blocked' : 'Credits remaining'}>
            <div className="px-3 py-1 rounded-full border bg-white text-sm shadow-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" fill="#FFF7ED" />
                <text x="50%" y="55%" textAnchor="middle" fontSize="9" fontWeight="700" fill="#C2410C">
                  C
                </text>
              </svg>
              <span style={{ fontWeight: 700 }}>{credits !== null ? credits.toLocaleString() : '—'}</span>
            </div>
          </div>

          <div className="user-button-wrapper" style={{ marginLeft: 12 }}>
            <SignedIn>
              <ClerkUserButton className="app-clerk-userbutton" />
            </SignedIn>

            <SignedOut>
              <SignInButton>
                <button
                  className="px-3 py-2 rounded-full border border-gray-200 bg-white shadow-sm text-sm"
                  aria-label="Sign in"
                  type="button"
                >
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </nav>
  );
}
