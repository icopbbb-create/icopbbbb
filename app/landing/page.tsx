// app/landing/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";

export default function LandingPage() {
  // Hide the navbar ONLY on landing (extra safety even though Navbar hides itself)
  useEffect(() => {
    const nav = document.querySelector("nav.navbar") as HTMLElement | null;
    if (nav) nav.style.display = "none";
    return () => {
      if (nav) nav.style.display = "";
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#03060a] px-6 py-16 text-white">
      
      <div className="flex flex-col items-center mb-10">
        <Image src="/images/logo.png" alt="logo" width={150} height={150} />
        <h1 className="text-4xl md:text-5xl font-bold mt-6 text-amber-300 text-center">
          Edu Voice Agent
        </h1>
        <p className="text-lg mt-3 text-amber-100/80 max-w-xl text-center">
          The world’s first real-time AI Teacher. Speak. Learn. Transform.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm mt-6">
        <Link
          href="/sign-in"
          className="w-full text-center py-3 rounded-lg bg-amber-500 text-white font-semibold shadow-lg hover:bg-amber-600 transition"
        >
          Get Started (Free)
        </Link>

        <Link
          href="/pro-request"
          className="w-full text-center py-3 rounded-lg bg-white text-black font-semibold shadow-md hover:bg-gray-200 transition"
        >
          Pro Users (Request Access)
        </Link>
      </div>

      <p className="text-amber-100/50 text-sm mt-10">
        © {new Date().getFullYear()} — Edu Voice Agent
      </p>
    </div>
  );
}
