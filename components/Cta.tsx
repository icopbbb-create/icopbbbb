import Image from "next/image";
import Link from "next/link";
import React from "react";

const TITLE = "Build and Personalize Learning Companion";

const Cta: React.FC = () => {
  // split into words so we can highlight the last word (Companion)
  const words = TITLE.split(" ");
  const lastIndex = words.length - 1;

  // helper to render a word as per-letter spans (applies highlight class for last word)
  const renderWord = (word: string, wordIndex: number) => {
    const chars = Array.from(word);
    const isLast = wordIndex === lastIndex;
    return (
      <span key={`word-${wordIndex}`} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
        {chars.map((ch, i) => (
          <span
            key={`char-${wordIndex}-${i}`}
            className={`char ${isLast ? "char-highlight" : ""}`}
            style={{ ["--i" as any]: i }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
    );
  };

  return (
    <section className="cta-section" aria-labelledby="cta-title">
      <div className="cta-badge">Start learning your way.</div>

      {/* title is built word-by-word so the last word can be highlighted */}
      <h2 id="cta-title" className="text-3xl font-bold cta-title" aria-label={TITLE}>
        {words.map((w, idx) => (
          <React.Fragment key={`w-${idx}`}>
            {renderWord(w, idx)}
            {/* add a thin spacing between words */}
            {idx < words.length - 1 && <span style={{ width: 6, display: "inline-block" }}>&nbsp;</span>}
          </React.Fragment>
        ))}
      </h2>

      <p className="cta-sub">
        Pick a name, subject, voice, & personality — and start learning through
        voice conversations that feel natural and fun.
      </p>

      {/* decorative images container — made larger and responsive */}
      <div className="cta-images" aria-hidden>
        {/* If you have a single SVG sprite, keep it as is. We size it via CSS. */}
        <Image src="/images/cta.svg" alt="decorative learning icons" width={420} height={300} />
      </div>

      {/* Link + button (valid Next.js usage) */}
      <Link href="/companions/new" className="w-full">
        <button className="btn-primary cta-button w-full" type="button" aria-label="Build a new companion">
          <span>Build a New Companion</span>
        </button>
      </Link>
    </section>
  );
};

export default Cta;
