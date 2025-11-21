"use client";

import React, { useMemo, useState } from "react";

type CompanionAvatarProps = {
  companion?: any | null; // server-normalized companion object (may include companion_image_url & raw)
  subject?: string | null;
  alt?: string;
  size?: number; // px
  className?: string;
  style?: React.CSSProperties;
};

export default function CompanionAvatar({
  companion,
  subject,
  alt,
  size = 56,
  className,
  style,
}: CompanionAvatarProps) {
  // helper: slugify subject/topic -> learn-language, meditation
  const slug = useMemo(() => {
    const s = (subject ?? (companion?.topic ?? companion?.name ?? "")).toString();
    return s
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
  }, [subject, companion]);

  // initial src preference: explicit companion image -> subject icon -> placeholder
  const candidateIcon = slug ? `/icons/${slug}.svg` : null;
  const initial =
    (companion && (companion.companion_image_url ?? companion.image_url ?? companion.url)) ||
    candidateIcon ||
    "/avatar-placeholder.png";

  const [src, setSrc] = useState<string>(initial);

  // on error, try the subject icon once if we were using a DB image and it failed,
  // otherwise fall back to placeholder
  const handleError = () => {
    // If current src is DB remote and we have a local icon candidate, try that next.
    const usingDbImage = !!(
      companion &&
      (companion.companion_image_url || companion.image_url || companion.url)
    );

    if (usingDbImage && candidateIcon && src !== candidateIcon) {
      setSrc(candidateIcon);
      return;
    }

    // If current src is candidateIcon or DB image and failed, fallback to placeholder
    if (src !== "/avatar-placeholder.png") {
      setSrc("/avatar-placeholder.png");
      return;
    }
    // otherwise do nothing
  };

  const computedAlt = alt ?? companion?.name ?? subject ?? "Companion";

  return (
    <img
      src={src}
      alt={computedAlt}
      onError={handleError}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "12px",
        objectFit: "cover",
        display: "inline-block",
        ...style,
      }}
      loading="lazy"
      decoding="async"
    />
  );
}
