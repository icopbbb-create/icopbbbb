// components/DeleteButton.tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  url,
  confirmMessage = "Are you sure you want to delete this? This action can be undone from the server if needed.",
  onSuccess,
  children = "Delete",
  className = "",
}: {
  url: string;
  confirmMessage?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`Could not delete: ${txt || res.status}`);
        setLoading(false);
        return;
      }
      // success
      onSuccess?.();
      // refresh current route / data
      try {
        router.refresh();
      } catch {}
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`text-sm px-3 py-1 rounded ${className}`}
      aria-label="Delete"
    >
      {loading ? "Deleting…" : children}
    </button>
  );
}
