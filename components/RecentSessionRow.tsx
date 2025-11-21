// components/RecentSessionRow.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

const subjectToIcon: Record<string, string> = {
    Meditation: "/icons/meditation.svg",
    "Mock Interview": "/icons/mock-interview.svg",
    "IAS Prep": "/icons/ques-ans-prep.svg",
    Yoga: "/icons/meditation.svg", // fallback icon since you don't have yoga.svg
  };
  

function subjectEmoji(subject?: string) {
  const map: Record<string, string> = {
    Meditation: "🧘",
    Yoga: "🧘‍♀️",
    "Mock Interview": "🎤",
    "IAS Prep": "🎯",
  };
  return map[subject ?? ""] || "📚";
}

export default function RecentSessionRow({ session }: { session: any }) {
  const companion = session.companions;
  const displayTitle =
    companion?.name ||
    companion?.subject ||
    `Session ${session.id}`;

  const subject = companion?.subject;
  const iconPath = subject ? subjectToIcon[subject] : null;

  return (
    <div className="flex items-center gap-3 p-2 rounded-md border hover:bg-accent transition">
      <div className="w-12 h-12 flex items-center justify-center">
        {iconPath ? (
          <Image
            src={iconPath}
            alt={subject || displayTitle}
            width={48}
            height={48}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl">
            {subjectEmoji(subject)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{displayTitle}</div>
        <div className="text-xs text-muted-foreground truncate">
          {new Date(session.created_at).toLocaleString()}
        </div>
      </div>

      <Link
        href={`/sessions/${session.id}/notes`}
        className="text-sm text-blue-500 hover:underline"
      >
        Take me there
      </Link>
    </div>
  );
}
