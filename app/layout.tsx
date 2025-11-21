// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";

import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground/AnimatedBackground";
import ClerkProviderClient from "@/components/ClerkProviderClient";
import NavGuard from "@/components/NavGuard";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Edu Voice Agent",
  description: "Real-time AI Teaching Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/images/logo.png" />
        {/* Removed custom cursor style and AnimatedCursor component usage */}
      </head>

      <body className={`${bricolage.variable} antialiased`}>
        {/* Animated background sits behind page content.
            - variant: "waves" | "particles" | "matrix"
            - opacity: 0..1
            - zIndex: override default z-index if needed
        */}
        <div className="animatedBackgroundRoot" aria-hidden>
          <AnimatedBackground variant="waves" opacity={0.95} zIndex={-1} />
        </div>

        {/* Clerk provider handles client-side session/UAT refresh */}
        <ClerkProviderClient>
          {/* NavGuard ensures protected pages don't flash unauthenticated */}
          <NavGuard>
            {/* Navbar auto-hides on sign-in, landing, logo pages */}
            <Navbar />
          </NavGuard>

          {/* App content */}
          {children}
        </ClerkProviderClient>
      </body>
    </html>
  );
}