'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface WebcamComponentProps {
  width?: number;
  height?: number;
}

export default function WebcamComponent({ width = 360, height = 200 }: WebcamComponentProps) {
  const webcamRef = useRef<Webcam | null>(null);
  // keep mirrored state so the preview remains mirrored by default, but no UI toggle
  const [mirrored] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) setScreenshot(imageSrc);
    }
  }, []);

  const clear = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setScreenshot(null);
  };

  const download = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!screenshot) return;
    const a = document.createElement('a');
    a.href = screenshot;
    a.download = 'snapshot.jpg';
    a.click();
  };

  const videoConstraints = {
    width,
    height,
    facingMode: 'user' as const,
  };

  return (
    <div
      className="webcam-dialog"
      style={{
        width: '100%',
        maxWidth: width,
        borderRadius: 12,
        padding: 6,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      <div style={{ width: '100%', height, borderRadius: 6, overflow: 'hidden', margin: '0 auto', display: 'block' }}>
        {!screenshot ? (
          <Webcam
            ref={webcamRef}
            mirrored={mirrored}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: mirrored ? 'scaleX(-1)' : 'none' }}
          />
        ) : (
          <img src={screenshot} alt="snapshot" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>

      <div className="webcam-actions" style={{ display: 'flex', alignItems: 'center' }}>
        {/* Capture */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            capture();
          }}
          aria-label="Capture snapshot"
        >
          Capture
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={(e) => clear(e)}
          aria-label="Clear snapshot"
        >
          Clear
        </button>

        {/* Download */}
        <button
          type="button"
          onClick={(e) => download(e)}
          aria-label="Download snapshot"
          disabled={!screenshot}
        >
          Download
        </button>
      </div>
    </div>
  );
}
