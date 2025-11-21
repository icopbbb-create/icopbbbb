"use client";

import React, { useState } from "react";
import { removeBookmark, addBookmark } from "@/lib/server/companion.actions";
import { usePathname, useRouter } from "next/navigation";
import CompanionIcon from "@/components/CompanionIcon";
import styles from "./CompanionCard.module.css";

interface CompanionCardProps {
  id: string;
  name: string;
  topic: string;
  subject: string;
  duration: number;
  color: string;
  bookmarked: boolean;
  companion_image_url?: string | null;
}

const CompanionCard = ({
  id,
  name,
  topic,
  subject,
  duration,
  color,
  bookmarked,
  companion_image_url,
}: CompanionCardProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [localBookmarked, setLocalBookmarked] = useState(Boolean(bookmarked));
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);

  const handleBookmark = async () => {
    try {
      // optimistic UI
      setLocalBookmarked((s) => !s);
      if (localBookmarked) {
        await removeBookmark(id, pathname);
      } else {
        await addBookmark(id, pathname);
      }
    } catch (err) {
      console.error("bookmark error", err);
      // rollback on error
      setLocalBookmarked((s) => !s);
    }
  };

  const startSessionAndOpen = async () => {
    if (starting) return;
    setStarting(true);

    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionId: id }),
      });

      if (!res.ok) {
        console.warn("Failed to create session row; navigating without sessionId", await res.text());
        router.push(`/companions/${id}`);
        return;
      }

      const payload = await res.json();
      const sessionId = payload?.id ?? null;

      if (sessionId) {
        router.push(`/companions/${id}?sessionId=${sessionId}`);
      } else {
        router.push(`/companions/${id}`);
      }
    } catch (err) {
      console.error("startSessionAndOpen error", err);
      router.push(`/companions/${id}`);
    } finally {
      setStarting(false);
    }
  };

  // DELETE handler: soft-delete companion via API, optimistic remove locally
  const handleDelete = async () => {
    const ok = confirm(
      "Delete this companion? This will remove it from the Companion Library and My Journey. This is a soft-delete (can be restored via DB)."
    );
    if (!ok) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/companions/${id}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        // try to surface server message if any
        let text = "";
        try {
          text = await res.text();
        } catch {}
        console.error("companion delete failed", res.status, text);
        alert(`Could not delete companion. (${res.status})`);
        setDeleting(false);
        return;
      }

      // success — hide immediately and refresh server pages
      setRemoved(true);
      // give a tiny delay to make UX feel responsive before refresh
      setTimeout(() => {
        try {
          router.refresh();
        } catch (e) {
          // ignore
        }
      }, 120);
    } catch (err) {
      console.error("delete companion error", err);
      alert("Could not delete companion. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (removed) return null;

  return (
    <article
      className={styles.companionCard}
      style={{ backgroundColor: color }}
      role="article"
      aria-labelledby={`companion-${id}-title`}
    >
      {/* LEFT — Avatar */}
      <div className={styles.left}>
        <CompanionIcon
          iconUrl={companion_image_url ?? undefined}
          subject={subject ?? name}
          size={64}
          className={styles.icon}
        />
      </div>

      {/* CENTER — Text */}
      <div className={styles.body}>
        <h2 id={`companion-${id}-title`} className={styles.title}>
          {name}
        </h2>

        <p className={styles.topic} title={topic || undefined}>
          {topic}
        </p>

        <div className={styles.meta}>
          <span className={styles.subject} tabIndex={0} role="button" title={`Subject: ${subject}`}>
            {subject}
          </span>

          <span className={styles.duration}>{duration} minutes</span>
        </div>
      </div>

      {/* RIGHT — Actions */}
      <div className={styles.actions}>
        <button
          className={styles.bookmark}
          onClick={handleBookmark}
          aria-pressed={localBookmarked}
          aria-label={localBookmarked ? "Remove bookmark" : "Add bookmark"}
          title={localBookmarked ? "Bookmarked" : "Bookmark"}
          type="button"
        >
          {/* Dark inline SVG bookmark — filled when bookmarked, outlined otherwise */}
          {localBookmarked ? (
            <svg
              className={styles.bookmarkIcon}
              width="18"
              height="20"
              viewBox="0 0 24 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
              focusable="false"
            >
              <path
                d="M6 2h12v22l-6-3-6 3V2z"
                fill="#0f172a" /* dark fill */
              />
            </svg>
          ) : (
            <svg
              className={styles.bookmarkIcon}
              width="18"
              height="20"
              viewBox="0 0 24 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
              focusable="false"
            >
              <path
                d="M6 2h12v22l-6-3-6 3V2z"
                fill="none"
                stroke="#0f172a"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <button
          onClick={startSessionAndOpen}
          className={`${styles.launchBtn} btn-primary`}
          type="button"
          aria-label={`Launch ${name} lesson`}
          disabled={starting}
        >
          {starting ? "Starting..." : "Launch Lesson"}
        </button>

        {/* Delete companion */}
        <button
          onClick={handleDelete}
          className={`${styles.launchBtn} ml-2`}
          type="button"
          aria-label={`Delete ${name}`}
          disabled={deleting}
          title="Delete companion"
          style={{
            background: "transparent",
            border: "1px solid rgba(15,23,42,0.06)",
            color: deleting ? "rgba(0,0,0,0.35)" : "#dc2626",
            fontWeight: 600,
            padding: "10px 12px",
            borderRadius: 8,
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
};

export default CompanionCard;
