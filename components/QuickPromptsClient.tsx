// components/QuickPromptsClient.tsx
"use client";

import { useState } from "react";

const PRESET_PROMPTS = [
  "Explain the chain rule with a concise example.",
  "Mock interview: system design question (5–10 min).",
  "Guided meditation for focus (5 mins).",
  "Q&A practice: Common DS & Algo interview questions.",
];

export default function QuickPromptsClient({
  onPick,
}: {
  onPick?: (txt: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const handlePick = async (txt: string) => {
    // 1) optional callback for parent (we won't pass any from server)
    try {
      if (onPick) onPick(txt);
      // 2) copy to clipboard as a helpful action
      await navigator.clipboard.writeText(txt);
      setCopied("Copied to clipboard");
      window.setTimeout(() => setCopied(null), 1800);
    } catch (err) {
      // fallback: alert
      alert("Prompt: " + txt);
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 p-4 bg-white/80 shadow-sm">
      <h4 className="text-sm font-semibold mb-3">Starter Prompts</h4>

      <div className="flex flex-col gap-2">
        {PRESET_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePick(p)}
            className="text-sm text-left rounded-md px-3 py-2 hover:bg-gray-50 transition flex items-center justify-between"
          >
            <span className="truncate">{p}</span>
            <span className="ml-3 text-xs text-muted-foreground">Copy</span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        <small className="text-xs text-muted-foreground">
          Click a prompt to copy it — then paste into the topic field.
        </small>
      </div>

      {copied && (
        <div className="mt-3 text-xs text-amber-700 font-medium">
          {copied}
        </div>
      )}
    </div>
  );
}
