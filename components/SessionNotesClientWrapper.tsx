'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// dynamic import the actual client component so server won't attempt to run client hooks
const SessionNotes = dynamic(() => import('./SessionNotes'), { ssr: false });

export default function SessionNotesClientWrapper({ sessionId }: { sessionId: string }) {
  return <SessionNotes sessionId={sessionId} />;
}
