'use client';

import React, { useState } from 'react';

import { subjectToIconFilename } from '@/lib/utils';

type Props = {
  iconUrl?: string | null;
  subject?: string | null;
  alt?: string | null;
  size?: number; // px
  className?: string;
  style?: React.CSSProperties;
};

export default function CompanionIcon({
  iconUrl,
  subject,
  alt,
  size = 48,
  className = '',
  style = {},
}: Props) {
  // start with provided image, otherwise compute fallback from subject
  const fallback = `/icons/${subjectToIconFilename(subject ?? '')}.svg`;
  const [src, setSrc] = useState<string | null>(iconUrl ?? fallback);

  const handleError = () => {
    // final fallback to default icon
    if (src !== '/icons/default.svg') setSrc('/icons/default.svg');
  };

  const label = alt ?? subject ?? 'Companion';

  // Use a standard <img> so onError handling is straightforward and lightweight for small icons.
  return (
    <img
      src={src ?? fallback}
      alt={label}
      title={label}
      width={size}
      height={size}
      onError={handleError}
      draggable={false}
      className={`rounded-2xl object-cover shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
    />
  );
}
