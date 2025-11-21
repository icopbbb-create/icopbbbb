// app/global-error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string } | null;
};

export default function GlobalError({ error }: Props) {
  useEffect(() => {
    if (!error) return;
    try {
      // capture on client-side Sentry (if configured)
      Sentry.captureException(error);
    } catch (e) {
      // swallow any Sentry errors — don't crash the error UI
      // eslint-disable-next-line no-console
      console.warn("Sentry capture failed", e);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-xl w-full bg-white rounded-2xl p-6 shadow-lg">
            <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-600 mb-4">
              An unexpected error occurred. The error has been recorded.
            </p>

            {error ? (
              <details className="text-xs text-gray-500 whitespace-pre-wrap">
                <summary className="cursor-pointer mb-2">Show error details</summary>
                <div style={{ whiteSpace: "pre-wrap" }}>{String(error?.stack ?? error?.message ?? error)}</div>
              </details>
            ) : null}

            <div className="mt-4">
              {/* Render Next's default error component for completeness */}
              <NextError statusCode={0} />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
