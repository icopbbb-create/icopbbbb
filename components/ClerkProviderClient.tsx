// components/ClerkProviderClient.tsx
"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

export default function ClerkProviderClient({ children }: { children: React.ReactNode }) {
  // Use NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (must be set in .env.local)
  // Clerk's client SDK will initialize automatically if publishableKey omitted in many setups,
  // but passing it explicitly helps avoid mis-config with multiple versions.
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? undefined;

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
