'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn, configureAssistant, getSubjectColor, subjectToIconFilename } from '@/lib/utils';
import { vapi } from '@/lib/vapi.sdk';
import Image from 'next/image';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import soundwaves from '@/constants/soundwaves.json';
import WebcamComponent from '@/components/WebcamComponent';
import styles from './Companion.module.css';
import { useRouter } from 'next/navigation';

// Types
type CompanionProps = {
  companionId: string;
  subject?: string;
  topic?: string;
  name?: string;
  userName?: string;
  userImage?: string;
  style?: string;
  voice?: string;
  duration?: number;
};

enum CallStatus {
  INACTIVE = 'INACTIVE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
}

export default function CompanionComponent(props: CompanionProps) {
  const {
    companionId,
    subject = 'general',
    topic = '',
    name = 'Companion',
    userName = 'You',
    userImage,
    style = 'casual',
    voice = 'default',
    duration = 15,
  } = props;

  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [vapiAvailable, setVapiAvailable] = useState(false);

  const lottieRef = useRef<LottieRefCurrentProps | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  // stable per-session clientSessionId and dedupe flag
  const clientSessionIdRef = useRef<string | null>(null);
  const hasPostedHistoryRef = useRef(false);

  // debounce timer for periodic saves when messages come in
  const saveDebounceRef = useRef<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (lottieRef.current) {
      if (isSpeaking) lottieRef.current.play();
      else lottieRef.current.stop();
    }
  }, [isSpeaking]);

  useEffect(() => {
    try {
      const ok = !!(vapi && typeof (vapi as any).isMuted === 'function' && typeof (vapi as any).setMuted === 'function');
      setVapiAvailable(Boolean(ok));
    } catch {
      setVapiAvailable(false);
    }
  }, []);

  // helper: assemble transcript from messages array
  const assembleTranscript = (msgs?: { role: string; content: string }[]) => {
    const list = msgs ?? messages;
    return list.map((m) => `${m.role || 'speaker'}: ${m.content ?? ''}`).join('\n');
  };

  // helper: save session history (update or create). If `end` is true, mark as final and set hasPostedHistoryRef.
  const saveHistory = async (opts?: { end?: boolean; extraMetadata?: any }) => {
    try {
      // make sure we have a clientSessionId
      if (!clientSessionIdRef.current) {
        try {
          clientSessionIdRef.current = crypto.randomUUID();
        } catch {
          clientSessionIdRef.current = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }
      }

      // if end already posted, avoid duplicate final posts
      if (opts?.end && hasPostedHistoryRef.current) return;

      const assembledTranscript = assembleTranscript();

      const payload = {
        clientSessionId: clientSessionIdRef.current,
        companionId,
        transcript: assembledTranscript || null,
        metadata: {
          ...(opts?.extraMetadata || {}),
          last_saved_at: new Date().toISOString(),
        },
      };

      // fire the POST but don't block UI too long
      await fetch(`/api/sessions/${encodeURIComponent(String(companionId))}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (opts?.end) {
        hasPostedHistoryRef.current = true;
      }
    } catch (e) {
      console.debug('save session history (client) failed', e);
    }
  };

  useEffect(() => {
    const onCallStart = () => {
      try {
        clientSessionIdRef.current = crypto.randomUUID();
      } catch {
        clientSessionIdRef.current = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      hasPostedHistoryRef.current = false;
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = async () => {
      setCallStatus(CallStatus.FINISHED);

      try {
        await saveHistory({ end: true, extraMetadata: { finished_at: new Date().toISOString(), message_count: messages.length } });
      } catch (e) {
        console.debug('save session history (client fallback) failed on end', e);
      }
    };

    const onMessage = (message: any) => {
      if (message?.type === 'transcript' && message?.transcriptType === 'final' && message?.transcript) {
        const newMessage = { role: message.role || 'assistant', content: String(message.transcript) };
        setMessages((prev) => {
          const next = [...prev, newMessage];

          if (saveDebounceRef.current) {
            window.clearTimeout(saveDebounceRef.current);
            saveDebounceRef.current = null;
          }
          saveDebounceRef.current = window.setTimeout(() => {
            saveHistory({ end: false, extraMetadata: { interim_save: true } });
            saveDebounceRef.current = null;
          }, 700);

          return next;
        });
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (err: any) => console.error('vapi error', err);

    try {
      vapi.on('call-start', onCallStart);
      vapi.on('call-end', onCallEnd);
      vapi.on('message', onMessage);
      vapi.on('error', onError);
      vapi.on('speech-start', onSpeechStart);
      vapi.on('speech-end', onSpeechEnd);
    } catch (e) {
      console.debug('vapi event attach failed (likely not ready)', e);
    }

    return () => {
      try {
        vapi.off('call-start', onCallStart);
        vapi.off('call-end', onCallEnd);
        vapi.off('message', onMessage);
        vapi.off('error', onError);
        vapi.off('speech-start', onSpeechStart);
        vapi.off('speech-end', onSpeechEnd);
      } catch {}

      if (saveDebounceRef.current) {
        window.clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
    };
  }, [companionId, messages]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleMicrophone = () => {
    if (!vapiAvailable) {
      console.warn('vapi mute API not available yet');
      return;
    }
    if (callStatus !== CallStatus.ACTIVE) {
      console.warn('Mic toggle attempted while call not active');
      return;
    }

    try {
      const muted = (vapi as any).isMuted();
      (vapi as any).setMuted(!muted);
      setIsMuted(!muted);
    } catch (e) {
      console.error('toggleMicrophone error', e);
    }
  };

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    if (!clientSessionIdRef.current) {
      try {
        clientSessionIdRef.current = crypto.randomUUID();
      } catch {
        clientSessionIdRef.current = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      hasPostedHistoryRef.current = false;
    }

    const assistantOverrides = {
      variableValues: { subject, topic, style },
      clientMessages: ['transcript'],
      serverMessages: [],
    };

    try {
      // CHARGE credits BEFORE starting session
      const res = await fetch('/api/credits/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5,
          action: 'session_start',
          note: `start session for companion ${companionId}`,
          sessionId: clientSessionIdRef.current,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        const errMsg = json?.error ?? 'Insufficient credits or blocked';

        if (json?.blocked) {
          router.push('/subscription/pro');
        }

        alert(errMsg);
        setCallStatus(CallStatus.INACTIVE);
        return;
      }

      // Start call
      //@ts-expect-error
      await vapi.start(configureAssistant(voice, style), assistantOverrides);
    } catch (e) {
      console.error('vapi.start error', e);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    try {
      if (vapi && typeof (vapi as any).stop === 'function') (vapi as any).stop();
    } catch {}
  };

  const clearTranscript = () => {
    setMessages([]);
  };

  const iconFile = subjectToIconFilename(subject || '');

  return (
    <section className={styles['eva-root']}>
      <div className={styles['eva-centerWrap']}>
        <div className={styles['eva-card']}>

          <div
            style={{
              background: 'linear-gradient(90deg,#fff7ef, #fff3e8)',
              borderRadius: 14,
              padding: 18,
              margin: '18px',
            }}
          >
            <div className={styles['eva-innerRow']}>

              {/* Avatar */}
              <div
                className={styles['eva-avatarBox']}
                style={{ backgroundColor: getSubjectColor(subject) }}
              >
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image src={`/icons/${iconFile}.svg`} alt={subject} width={140} height={140} />
                </div>

                {isSpeaking && (
                  <div className={styles['eva-lottieActiveContainer']} aria-hidden>
                    <Lottie lottieRef={lottieRef} animationData={soundwaves} autoplay={false} className={styles['eva-lottie']} />
                  </div>
                )}
              </div>

              {/* Webcam */}
              <div className={styles['eva-webcamWrap']} role="region" aria-label="webcam">
                <WebcamComponent width={260} height={140} />
              </div>

              {/* Right Col */}
              <aside className={styles['eva-rightCol']}>
                <div className={styles['eva-rightPanel']}>
                  <div className={styles['eva-userCard']}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      {userImage ? (
                        <Image src={userImage} alt={userName} width={120} height={120} style={{ borderRadius: 10 }} />
                      ) : (
                        <div style={{ width: 120, height: 120, borderRadius: 12, background: '#2f6f2f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                          {userName?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                      )}
                    </div>

                    <p style={{ fontWeight: 700, marginBottom: 6 }}>{userName}</p>
                    <p style={{ color: '#6b7280', margin: 0 }}>{topic}</p>
                  </div>

                  <div className={styles['eva-controls']}>
                    <button
                      className={styles['eva-micBtn']}
                      onClick={toggleMicrophone}
                      aria-pressed={isMuted}
                      disabled={!vapiAvailable || callStatus !== CallStatus.ACTIVE}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span aria-hidden>🎤</span>
                        <span>{isMuted ? 'Microphone off' : 'Microphone on'}</span>
                      </div>
                    </button>

                    <button
                      onClick={callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall}
                      className={styles['eva-startBtn']}
                    >
                      {callStatus === CallStatus.ACTIVE
                        ? 'End Session'
                        : callStatus === CallStatus.CONNECTING
                        ? 'Connecting…'
                        : 'Start Session'}
                    </button>
                  </div>
                </div>
              </aside>

            </div>
          </div>

        </div>
      </div>

      <section className={styles['eva-transcriptSection']}>
        <div className={styles['eva-transcriptCard']}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Transcript</h3>
            <div>
              <button onClick={clearTranscript} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                Clear
              </button>
            </div>
          </div>

          <div
            ref={transcriptRef}
            aria-live="polite"
            style={{
              maxHeight: '40vh',
              overflowY: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderRadius: 8,
              background: 'linear-gradient(180deg,#ffffff,#fbfbfb)',
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#6b7280' }}>
                No transcript yet. Click <strong>Start Session</strong> to begin.
              </div>
            )}

            {messages.map((message, index) => {
              const isAssistant = message.role === 'assistant';
              return (
                <div key={index} style={{ display: 'flex', justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: isAssistant ? '#f3f4f6' : '#fff7ed',
                      color: isAssistant ? '#111827' : '#9c2a00',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      fontSize: 15,
                      lineHeight: 1.3,
                    }}
                  >
                    <div style={{ fontSize: 12, marginBottom: 6, color: '#6b7280' }}>
                      {isAssistant ? name.split(' ')[0] || 'Tutor' : userName || 'You'}
                    </div>

                    <div>{message.content}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </section>
  );
}
