'use client';

import React from 'react';
import WebcamComponent from '@/components/WebcamComponent';

type Props = {
  companionId: string;
};

export default function CompanionWebcamWrapper({ companionId }: Props) {
  // show a compact webcam (width 220 x 160) with controls
  return <WebcamComponent width={220} height={160} />;
}
