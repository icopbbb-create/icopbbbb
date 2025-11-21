// app/room/[roomId]/page.tsx
import React from 'react';
import WebcamComponent from '@/components/WebcamComponent';
import { notFound } from 'next/navigation';

type Props = {
  params: { roomId: string };
};

export default function RoomPage({ params }: Props) {
  const { roomId } = params;

  // Optional: basic validation
  if (!roomId || roomId.trim().length === 0) {
    // show 404 if bad room id
    notFound();
  }

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 12 }}>Room: {roomId}</h1>
      <p style={{ marginBottom: 16 }}>This is a simple webcam embed for this room.</p>

      {/* showCapture: true will enable capture/download controls */}
      <WebcamComponent roomId={roomId} showCapture={true} />
    </main>
  );
}
