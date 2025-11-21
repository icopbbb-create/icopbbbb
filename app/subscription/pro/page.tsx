// app/subscription/pro/page.tsx
"use client";

import React, { useEffect, useState } from "react";

/**
 * Recharge / Payment page (safe)
 *
 * - Robust QR area that tries to load a real QR image and falls back to SVG.
 * - Debug "View large QR" opens the provided file path (dev will transform local path to URL).
 * - Shows brand logo using provided local path (dev will transform local path to URL).
 */

type Tier = { price: number; credits: number; label: string; note?: string };

const TIERS: Tier[] = [
  { price: 100, credits: 120, label: "Entry", note: "entry-level (extra bonus credits)" },
  { price: 250, credits: 320, label: "Mid", note: "good mid-tier" },
  { price: 500, credits: 700, label: "Saver", note: "big saver" },
  { price: 1200, credits: 1800, label: "Pro", note: "maximum bundle (best value)" },
];

// LOCAL FILE PATHS (these are the exact local paths you provided; your environment/tooling will transform them to served URLs)
const BRAND_LOGO_LOCAL_PATH = "/edu-logo/assets/edu-voice-logo-DKsYEA5O.png";
const QR_LOCAL_PATH = "/qr/edu-qr.png";

// Account details shown/copied to clipboard — EDIT THIS to your real account/UPI string
const ACCOUNT_DETAILS = "UPI: icopbbb@oksbi | Acc: 41156075268 | IFSC: SBINOO40345";

export default function ProRechargePage() {
  const [userId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [selectedTier, setSelectedTier] = useState<Tier>(TIERS[0]);

  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-orange", "#ff7a1a");
  }, []);

  // read file as base64 for payload
  async function handleFileChange(file?: File) {
    if (!file) {
      setReceiptBase64(null);
      setReceiptFileName(null);
      setReceiptPreviewUrl(null);
      return;
    }
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setReceiptBase64(dataUrl.split(",")[1] ?? null);
      setReceiptPreviewUrl(dataUrl);
    };
    reader.onerror = (err) => {
      console.error("file read error", err);
      setError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    handleFileChange(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    if (!name || !email || !phone || !username) {
      setError("Please fill all fields.");
      setLoading(false);
      return;
    }

    const payload: any = {
      userId: userId ?? username,
      username,
      name,
      email,
      phone,
      price: selectedTier.price,
      credits: selectedTier.credits,
      provider: "manual_qr",
      note: `QR request by ${name} (${email})`,
      receipt_base64: receiptBase64 ?? null,
      receipt_filename: receiptFileName ?? null,
    };

    if (transactionId && transactionId.trim().length > 0) {
      payload.transaction_id = transactionId.trim();
    }

    try {
      const res = await fetch("/api/credits/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (!res.ok || json.error) {
          setError(json.error || json.message || "Failed to send request");
        } else {
          setMessage(json.message || "Request sent, credits will be updated within few minutes");
        }
      } else {
        const text = await res.text();
        console.warn("Non-JSON response from /api/credits/request:", text);
        setError("Server returned non-JSON response. Check server logs. Preview: " + text.slice(0, 300));
      }
    } catch (err: any) {
      console.error(err);
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyAccountDetails() {
    navigator.clipboard?.writeText(ACCOUNT_DETAILS);
    setMessage("Account info copied to clipboard. Proceed to your bank app and complete the payment.");
    setTimeout(() => setMessage(null), 6000);
  }

  function QRArea() {
    const [imgError, setImgError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const imgSrc = QR_LOCAL_PATH;

    return (
      <div className="flex flex-col items-center">
        {!imgError && (
          <img
            src={imgSrc}
            alt="Scan to pay QR"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{ maxWidth: 220, borderRadius: 8, display: imgLoaded ? "block" : "none" }}
          />
        )}

        {!imgLoaded && !imgError && (
          <div className="w-40 h-40 flex items-center justify-center bg-white rounded-md shadow-sm">
            <div className="text-xs text-slate-400">Loading QR…</div>
          </div>
        )}

        {imgError && (
          <div className="mt-3">
            <svg viewBox="0 0 120 120" width="120" height="120" className="rounded-md bg-white">
              <rect x="2" y="2" width="116" height="116" rx="8" fill="#fff" stroke="#1118" />
              <rect x="6" y="6" width="26" height="26" fill="#111" rx="3" />
              <rect x="88" y="6" width="26" height="26" fill="#111" rx="3" />
              <rect x="6" y="88" width="26" height="26" fill="#111" rx="3" />
            </svg>
            <div className="text-xs text-slate-400 mt-2">QR not found — upload the file or ask the dev to map the local path to a served URL.</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-[#fff8f2] py-12">
      <style>{`
        .btn-brand { background: linear-gradient(180deg, #ff8a33, #ff6a00); }
        .float-anim { animation: float-y 4s ease-in-out infinite; }
        @keyframes float-y { 0%{transform:translateY(0)}50%{transform:translateY(-6px)}100%{transform:translateY(0)} }
      `}</style>

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="w-full lg:w-2/3">
            <div className="rounded-2xl bg-white p-8 shadow-lg border overflow-hidden relative">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={BRAND_LOGO_LOCAL_PATH}
                  alt="Edu Voice Agent"
                  className="h-14 w-14 rounded-full object-cover shadow-sm float-anim"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Recharge Credits</h2>
                  <p className="text-sm text-slate-500">Choose a bundle, pay using the QR, then submit this form to notify us.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label>
                    <span className="text-xs font-medium text-slate-600">Full name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33]" />
                  </label>

                  <label>
                    <span className="text-xs font-medium text-slate-600">Email address</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33]" />
                  </label>

                  <label>
                    <span className="text-xs font-medium text-slate-600">Phone number</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9XXXXXXXXX"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33]" />
                  </label>

                  <label>
                    <span className="text-xs font-medium text-slate-600">Username (account)</span>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_account_username"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33]" />
                  </label>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-600">Select credits bundle</span>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TIERS.map((t) => (
                      <button key={t.price} type="button" onClick={() => setSelectedTier(t)}
                        className={`text-left p-4 rounded-xl border transform transition hover:scale-[1.01] ${
                          selectedTier.price === t.price ? "border-[#ff8a33] bg-gradient-to-br from-[#fff2ea] to-white shadow-sm" : "border-slate-200 bg-white"
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-slate-900">₹{t.price} — {t.credits} credits</div>
                            <div className="text-sm text-slate-500">{t.note}</div>
                          </div>
                          {selectedTier.price === t.price ? <div className="text-sm font-medium text-[#ff8a33]">Selected</div> : <div className="text-sm text-slate-400">Select</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1">
                    <span className="text-xs font-medium text-slate-600">Or custom credits</span>
                    <input type="number" min={1} onChange={(e) => {
                      const v = Number(e.target.value || 0);
                      if (v > 0) setSelectedTier({ price: Math.max(1, v), credits: v, label: "Custom" });
                    }} placeholder="Enter credits (e.g., 200)"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33]" />
                    <div className="text-xs text-slate-400 mt-1">If you enter custom credits, price will be set equal to credits for manual processing.</div>
                  </label>
                </div>

                {/* upload receipt image */}
                <div>
                  <span className="text-xs font-medium text-slate-600">Attach payment screenshot (optional)</span>
                  <div className="mt-2 flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={onFileInputChange} />
                    {receiptFileName && <div className="text-sm text-slate-500">{receiptFileName}</div>}
                  </div>
                  {receiptPreviewUrl && <img src={receiptPreviewUrl} alt="receipt preview" className="mt-3 max-h-40 rounded-md shadow-sm" />}
                </div>

                {/* transaction id */}
                <div>
                  <label>
                    <span className="text-xs font-medium text-slate-600">Transaction ID (optional)</span>
                    <input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="UPI / bank txn ID"
                      className="mt-2 w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-[#ffd6bf] focus:border-[#ff8a33]"
                    />
                    <div className="text-xs text-slate-400 mt-1">If you have a transaction/UPI ID, paste it here so we can verify faster.</div>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button type="submit" disabled={loading} className="btn-brand inline-flex items-center gap-3 px-6 py-2 rounded-xl text-white font-semibold">
                    {loading ? "Sending..." : `Request ₹${selectedTier.price} — ${selectedTier.credits} credits`}
                  </button>

                  <button type="button" onClick={() => { setName(""); setEmail(""); setPhone(""); setUsername(""); setSelectedTier(TIERS[0]); setReceiptFileName(null); setReceiptPreviewUrl(null); setReceiptBase64(null); setTransactionId(""); setMessage(null); setError(null); }} className="px-4 py-2 rounded-lg border">Reset</button>
                </div>

                <div>
                  {message && <div className="rounded-md p-4 bg-green-50 text-green-800 border border-green-100"><strong>{message}</strong><div className="text-sm mt-1">We will process the request shortly and you will see credits updated on your account.</div></div>}
                  {error && <div className="rounded-md p-4 bg-red-50 text-red-800 border border-red-100"><strong>Failed:</strong> <span className="ml-2">{error}</span></div>}
                </div>
              </form>
            </div>
          </div>

          {/* right panel: QR + info */}
          <aside className="w-full lg:w-1/3">
            <div className="rounded-2xl bg-gradient-to-tr from-white to-[#fff7f0] p-6 shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Scan & Pay</h3>
                  <p className="text-sm text-slate-500 mt-1">Scan this QR with your banking or UPI app and send the required amount to our account.</p>
                </div>
                <div className="px-3 py-1 rounded-full border text-sm text-[#ff7a1a] font-medium">Secure</div>
              </div>

              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <QRArea />
                </div>

                <div className="text-sm text-slate-600 text-center">
                  <div>Amount: <strong>₹{selectedTier.price}</strong></div>
                  <div>Credits: <strong>{selectedTier.credits}</strong></div>
                </div>

                <div className="w-full">
                  <div className="text-xs text-slate-500 mb-2">After payment, click <strong>Request Credits</strong> to notify us. We will verify and process the request.</div>
                  <div className="flex gap-2">
                    <button onClick={copyAccountDetails} className="px-3 py-2 rounded-md border text-sm w-full">Copy account details</button>
                    <button onClick={() => { window.open(QR_LOCAL_PATH, "_blank"); }} className="px-3 py-2 rounded-md border text-sm w-full">View large QR</button>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-slate-400">We verify UPI/QR payments and update credits manually. Processing time: a few minutes.</div>
            </div>

            <div className="mt-6 rounded-xl p-4 bg-white border shadow-sm">
              <div className="flex items-center gap-3">
                <img src={BRAND_LOGO_LOCAL_PATH} alt="logo" className="h-10 w-10 rounded-full" onError={(e)=>{ (e.target as HTMLImageElement).src='/logo.png' }} />
                <div>
                  <div className="text-sm font-bold">Edu Voice Agent</div>
                  <div className="text-xs text-slate-500">Trusted learning assistant</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-600">
                Tip: For faster processing, after paying via QR attach the transaction reference in the notes field when submitting the request.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
