// app/subscription/recharge/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Tier = { price: number; credits: number; label: string; note?: string };

const TIERS: Tier[] = [
  { price: 100, credits: 120, label: 'Entry', note: 'entry-level (extra bonus credits)' },
  { price: 250, credits: 320, label: 'Mid', note: 'good mid-tier' },
  { price: 500, credits: 700, label: 'Saver', note: 'big saver' },
  { price: 1200, credits: 1800, label: 'Pro', note: 'maximum bundle (best value)' },
];

export default function RechargePage({ params }: { params?: any }) {
  // If you can pass userId from server component, do so; otherwise get from auth client
  const [userId] = useState<string | null>(null); // TODO: set from Clerk/Supabase session
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [selectedTier, setSelectedTier] = useState<Tier>(TIERS[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // small flourish: floating background offset animation
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-orange', '#ff7a1a');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    // Basic validation
    if (!name || !email || !phone || !username) {
      setError('Please fill all fields.');
      setLoading(false);
      return;
    }

    const payload: Record<string, any> = {
      userId: userId ?? null,
      username,
      name,
      email,
      phone,
      price: selectedTier.price,
      credits: selectedTier.credits,
      provider: 'manual_qr',
      note: `QR request by ${name} (${email})`,
    };

    // include transaction id if present
    if (transactionId && transactionId.trim().length > 0) {
      payload.transaction_id = transactionId.trim();
    }

    try {
      const res = await fetch('/api/credits/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Failed to send request');
      } else {
        setMessage(json.message || 'Request sent, credits will be updated within few minutes');
        // Optionally clear form or keep it to show QR scanned verification
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // placeholder SVG QR generator (stylized) — replace with real QR img if you have it
  function QRSVG({ code = 'edu-qr' }: { code?: string }) {
    // simple decorative QR-like grid
    return (
      <svg viewBox="0 0 120 120" width="220" height="220" className="rounded-md shadow-inner bg-white">
        <rect x="2" y="2" width="116" height="116" rx="8" fill="#fff" stroke="#1118" />
        {/* corners */}
        <rect x="6" y="6" width="26" height="26" fill="#111" rx="3" />
        <rect x="88" y="6" width="26" height="26" fill="#111" rx="3" />
        <rect x="6" y="88" width="26" height="26" fill="#111" rx="3" />
        {/* inner dots (pattern) */}
        {Array.from({ length: 12 }).map((_, r) =>
          Array.from({ length: 12 }).map((_, c) => {
            const x = 10 + c * 8;
            const y = 10 + r * 8;
            // random-ish pattern but deterministic by (r+c)
            if ((r + c) % 3 === 0) {
              return <rect key={`${r}-${c}`} x={x} y={y} width="5" height="5" fill="#111" rx="1" />;
            }
            return null;
          })
        )}
        <text x="60" y="115" textAnchor="middle" fontSize="6" fill="#666">{code}</text>
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-[#fff8f2] py-12">
      <style>{`
        @keyframes float-y {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .float-anim { animation: float-y 4s ease-in-out infinite; }
        @keyframes pulse-brand {
          0% { box-shadow: 0 0 0 0 rgba(255,122,26,0.12); }
          70% { box-shadow: 0 0 0 12px rgba(255,122,26,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,122,26,0); }
        }
        .btn-brand { background: linear-gradient(180deg, #ff8a33, #ff6a00); }
        .btn-brand:focus { outline: none; box-shadow: 0 6px 18px rgba(255,122,26,0.18); }
      `}</style>

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* left - form */}
          <div className="w-full lg:w-2/3">
            <div className="rounded-2xl bg-white p-8 shadow-lg border overflow-hidden relative">
              {/* Brand header */}
              <div className="flex items-center gap-4 mb-6">
                <img src="/logo.png" alt="Brand" className="h-14 w-14 rounded-full object-cover shadow-sm float-anim" />
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Recharge Credits</h2>
                  <p className="text-sm text-slate-500">Choose a bundle or enter a custom amount. Scan the QR code to pay — we’ll apply credits after verification.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Full name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33] transition"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Email address</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33] transition"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Phone number</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9XXXXXXXXX"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33] transition"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Username (account)</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your_account_username"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33] transition"
                    />
                  </label>
                </div>

                {/* credits selection */}
                <div>
                  <span className="text-xs font-medium text-slate-600">Select credits bundle</span>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TIERS.map((t) => (
                      <button
                        type="button"
                        key={t.price}
                        onClick={() => setSelectedTier(t)}
                        className={`text-left p-4 rounded-xl border transform transition hover:scale-[1.01] ${
                          selectedTier.price === t.price
                            ? 'border-[#ff8a33] bg-gradient-to-br from-[#fff2ea] to-white shadow-sm'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-slate-900">₹{t.price} — {t.credits} credits</div>
                            <div className="text-sm text-slate-500">{t.note}</div>
                          </div>
                          {selectedTier.price === t.price ? (
                            <div className="text-sm font-medium text-[#ff8a33]">Selected</div>
                          ) : (
                            <div className="text-sm text-slate-400">Select</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1">
                    <span className="text-xs font-medium text-slate-600">Or custom credits</span>
                    <input
                      type="number"
                      min={1}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        if (v > 0) {
                          setSelectedTier({ price: Math.max(1, v), credits: v, label: 'Custom' });
                        }
                      }}
                      placeholder="Enter credits (e.g., 200)"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33] transition"
                    />
                    <div className="text-xs text-slate-400 mt-1">If you enter custom credits, price will be set equal to credits for manual processing.</div>
                  </label>
                </div>

                {/* transaction id */}
                <div>
                  <label>
                    <span className="text-xs font-medium text-slate-600">Transaction ID (optional)</span>
                    <input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="UPI / bank txn ID"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33] transition"
                    />
                    <div className="text-xs text-slate-400 mt-1">If you have a transaction/UPI ID, paste it here so we can verify faster.</div>
                  </label>
                </div>

                {/* submit */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brand inline-flex items-center gap-3 px-6 py-2 rounded-xl text-white font-semibold hover:opacity-95"
                  >
                    {loading ? 'Sending...' : `Request ₹${selectedTier.price} — ${selectedTier.credits} credits`}
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 5l7 7-7 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setName(''); setEmail(''); setPhone(''); setUsername('');
                      setSelectedTier(TIERS[0]); setTransactionId('');
                      setMessage(null); setError(null);
                    }}
                    className="px-4 py-2 rounded-lg border"
                  >
                    Reset
                  </button>
                </div>

                {/* messages */}
                <div>
                  {message && (
                    <div className="rounded-md p-4 bg-green-50 text-green-800 border border-green-100">
                      <strong>{message}</strong>
                      <div className="text-sm mt-1">We will process the request shortly and you will see credits updated on your account.</div>
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md p-4 bg-red-50 text-red-800 border border-red-100">
                      <strong>Failed:</strong> <span className="ml-2">{error}</span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* right - QR + info */}
          <aside className="w-full lg:w-1/3">
            <div className="rounded-2xl bg-gradient-to-tr from-white to-[#fff7f0] p-6 shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Scan & Pay</h3>
                  <p className="text-sm text-slate-500 mt-1">Scan this QR with your banking app or UPI app and send the required amount to our account.</p>
                </div>
                <div className="px-3 py-1 rounded-full border text-sm text-[#ff7a1a] font-medium">Secure</div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <QRSVG code={`edu-${selectedTier.price}`} />
                </div>

                <div className="text-sm text-slate-600 text-center">
                  <div>Amount: <strong>₹{selectedTier.price}</strong></div>
                  <div>Credits: <strong>{selectedTier.credits}</strong></div>
                </div>

                <div className="w-full">
                  <div className="text-xs text-slate-500 mb-2">After payment, click <strong>Request Credits</strong> to notify us. We will verify and process the request.</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // handy copy simulated account detail
                        navigator.clipboard?.writeText('UPI: eduvoice@upi | Acc: 1234567890');
                        setMessage('Account info copied to clipboard. Proceed to your bank app and complete the payment.');
                      }}
                      className="px-3 py-2 rounded-md border text-sm w-full"
                    >
                      Copy account details
                    </button>

                    <button
                      onClick={() => {
                        // simulate opening a larger QR in new tab or popup
                        window.open('/logo.png', '_blank');
                      }}
                      className="px-3 py-2 rounded-md border text-sm w-full"
                    >
                      View large QR
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-slate-400">We will manually verify UPI/QR payments and update credits. Processing time: few minutes.</div>
            </div>

            {/* brand promo */}
            <div className="mt-6 rounded-xl p-4 bg-white border shadow-sm">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="logo" className="h-10 w-10 rounded-full" />
                <div>
                  <div className="text-sm font-bold">Edu Voice Agent</div>
                  <div className="text-xs text-slate-500">Trusted learning assistant</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600">
                Tip: For faster processing, after paying via QR, submit the request and attach the transaction reference in the notes field.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
