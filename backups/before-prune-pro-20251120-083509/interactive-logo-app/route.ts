// app/interactive-logo-app/route.ts
import { NextResponse } from "next/server";

function cloneSearchParams(source: URLSearchParams, target: URLSearchParams) {
  for (const [k, v] of source.entries()) {
    target.append(k, v);
  }
}

// A helper to stringify search params for logging
function dumpParams(params: URLSearchParams) {
  const entries: Record<string, string[]> = {};
  for (const [k, v] of params.entries()) {
    if (!entries[k]) entries[k] = [];
    entries[k].push(v);
  }
  return JSON.stringify(entries, null, 2);
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const origin = incoming.origin;

  // *** DEBUG LOGGING ***
  console.log("===== [interactive-logo-app/GET] Incoming request =====");
  console.log("URL:", incoming.toString());
  console.log("PATH:", incoming.pathname);
  console.log("Incoming search params:\n", dumpParams(incoming.searchParams));
  console.log("Has __clerk_handshake:", incoming.searchParams.has("__clerk_handshake"));
  console.log("========================================================");

  // Forward to Vite SPA
  const dest = new URL("/edu-logo/index.html", origin);
  cloneSearchParams(incoming.searchParams, dest.searchParams);

  console.log("===== Forwarding to =====");
  console.log(dest.toString());
  console.log("========================================================");

  return NextResponse.redirect(dest);
}

export async function POST(request: Request) {
  const incoming = new URL(request.url);
  const origin = incoming.origin;

  // *** DEBUG LOGGING ***
  console.log("===== [interactive-logo-app/POST] Incoming request =====");
  console.log("URL:", incoming.toString());
  console.log("PATH:", incoming.pathname);
  console.log("Incoming search params:\n", dumpParams(incoming.searchParams));
  console.log("Has __clerk_handshake:", incoming.searchParams.has("__clerk_handshake"));
  console.log("========================================================");

  // Forward to Vite SPA
  const dest = new URL("/edu-logo/index.html", origin);
  cloneSearchParams(incoming.searchParams, dest.searchParams);

  console.log("===== Forwarding to =====");
  console.log(dest.toString());
  console.log("========================================================");

  return NextResponse.redirect(dest);
}
