// landingPageClient.tsx
"use client";
import Image from "next/image";
import { useState, MouseEvent } from "react";
import styles from "./landing.module.css";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const plans = [
  {
    id: "free",
    name: "Free",
    priceLabel: "Free",
    credits: "50 credits",
    features: ["10 Conversations/month", "3 active companions", "basic session recaps"],
    cta: { label: "Get Started", href: "/home", kind: "free" },
    highlight: false,
  },
];

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalText, setModalText] = useState("");
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const { isSignedIn } = useAuth();
  const router = useRouter();

  // handle CTA click: ripple + modal for paid; direct navigate for free after ripple
  function handleCtaClick(e: MouseEvent<HTMLAnchorElement>, planId: string, href: string, kind?: string) {
    e.preventDefault();
    const target = e.currentTarget;
    createRipple(target, e);

    if (kind === "paid") {
      // show modal then redirect (paid unchanged except new href)
      setModalText("Preparing secure checkout…");
      setRedirectUrl(href);
      setModalOpen(true);
      setTimeout(() => {
        // animate success
        setModalText("Redirecting…");
        setTimeout(() => {
          if (href) window.location.href = href;
        }, 600);
      }, 700);
    } else {
      // free: require sign-in if not signed in
      if (!isSignedIn) {
        // small micro-interaction then redirect to sign-in with redirect back to intended page
        setModalText("Opening sign-in…");
        setModalOpen(true);
        setTimeout(() => {
          setModalOpen(false);
          const dest = `/sign-in?redirect=${encodeURIComponent(href || "/home")}`;
          router.push(dest);
        }, 500);
        return;
      }

      // signed in -> direct navigate to workspace
      setModalText("Taking you to your workspace…");
      setModalOpen(true);
      setTimeout(() => {
        setModalOpen(false);
        if (href) router.push(href);
      }, 500);
    }
  }

  // ripple creation (vanilla DOM element appended to the anchor)
  function createRipple(el: HTMLElement, ev: MouseEvent<HTMLElement>) {
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = ev.clientX - rect.left - size / 2;
    const y = ev.clientY - rect.top - size / 2;

    ripple.className = styles.ripple;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    el.appendChild(ripple);
    ripple.addEventListener(
      "animationend",
      () => {
        try {
          ripple.remove();
        } catch {}
      },
      { once: true }
    );
  }

  return (
    <main className={`${styles.container} landing-page min-h-screen text-orange-900`}>
      <div className={styles.bgDecor} aria-hidden />

      {/* Hero */}
      <section className={`${styles.hero} text-center`}>
        <a href="/sign-in" aria-label="Sign in or get started" className={styles.logoWrap}>
          <Image src="/images/logo.png" alt="Edu Voice Agent Logo" width={180} height={180} className="drop-shadow-lg" />
        </a>

        <h1 className={`${styles.heroTitle}`}>Edu Voice Agent</h1>
        <p className="max-w-3xl mx-auto mb-6 text-orange-800/90 px-4">
          AI-powered learning that listens, explains, and helps you remember. Use voice-first companions to study smarter,
          track progress, and turn conversations into learning.
        </p>

        <a
          href="/sign-in"
          className={`${styles.primaryCta} inline-block`}
          onClick={(e) => {
            e.preventDefault();
            createRipple(e.currentTarget as HTMLElement, e);
            setModalText("Opening sign-in…");
            setModalOpen(true);
            setTimeout(() => {
              setModalOpen(false);
              router.push("/sign-in");
            }, 600);
          }}
        >
          Sign in / Get Started
        </a>
      </section>

      {/* Features */}
      <section className="w-full flex flex-col items-center mt-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-orange-600 text-center">Why Choose Edu Voice Agent?</h2>
        <div className="features grid grid-cols-1 md:grid-cols-3 gap-8 py-6 max-w-5xl mx-auto w-full px-4">
          <div className={`${styles.featureCard} p-6 rounded-lg shadow bg-[#fff3e0] border border-orange-200`}>
            <h3 className="font-bold text-xl mb-2 text-orange-500">Create Your Own AI Tutor</h3>
            <p className="text-orange-800/80">
              Design companions with unique personalities, voices, and expertise. Tailor them to your learning style and
              goals for a truly custom experience.
            </p>
          </div>

          <div className={`${styles.featureCard} p-6 rounded-lg shadow bg-[#fff3e0] border border-orange-200`}>
            <h3 className="font-bold text-xl mb-2 text-orange-500">Conversational Learning</h3>
            <p className="text-orange-800/80">
              Engage in natural, real-time conversations—by voice or text. Ask questions, get explanations, and practice
              skills in a supportive, interactive environment.
            </p>
          </div>

          <div className={`${styles.featureCard} p-6 rounded-lg shadow bg-[#fff3e0] border border-orange-200`}>
            <h3 className="font-bold text-xl mb-2 text-orange-500">Track Progress & Achievements</h3>
            <p className="text-orange-800/80">
              Monitor your learning journey with detailed session history, progress tracking, and personalized recommendations
              to help you grow.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
<section className={`${styles.subscription} py-12 bg-[#ffe6c7] text-center border-y border-orange-200`}>
  <h2 className="text-3xl font-bold mb-4 text-orange-600">Choose Your Plan</h2>

  <p className="mb-8 text-orange-700 max-w-2xl mx-auto px-4">
    Use the free credits, and recharge anytime when you need more.
  </p>

  <div className="flex justify-center px-4">
    <div className="w-full max-w-md">
      <article
        className={`${styles.planCard} p-6 flex flex-col items-center shadow-lg rounded-2xl`}
        data-plan-id="free"
      >
        {/* Title */}
        <div className="text-3xl font-bold mb-2 text-orange-600">Free</div>

        {/* Credits */}
        <div className="text-xl font-extrabold mb-3 text-orange-500">
          50 credits
        </div>

        {/* Centered Feature List */}
        <ul className="text-orange-800/90 mb-6 mt-2 space-y-4 text-base text-center">
          <li className="flex items-center justify-center gap-3">
            <span className="inline-block w-2 h-2 mt-[2px] rounded-full bg-orange-400" />
            <span>Basic conversations</span>
          </li>

          <li className="flex items-center justify-center gap-3">
            <span className="inline-block w-2 h-2 mt-[2px] rounded-full bg-orange-400" />
            <span>Create companions</span>
          </li>

          <li className="flex items-center justify-center gap-3">
            <span className="inline-block w-2 h-2 mt-[2px] rounded-full bg-orange-400" />
            <span>Session recaps</span>
          </li>
        </ul>

        {/* CTA */}
        <a
          href="/home"
          onClick={(e) => handleCtaClick(e, "free", "/home", "free")}
          className={`${styles.planCta} mt-auto inline-block px-8 py-3 rounded-lg text-base font-semibold`}
          aria-label="Get Started - Free Plan"
        >
          Get Started
        </a>
      </article>
    </div>
  </div>
</section>



      {/* Testimonials */}
      <section className="testimonials py-12 max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8 text-center text-orange-600">What Our Users Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="testimonial-card p-6 rounded-lg shadow bg-[#fff3e0] border border-orange-200">
            <p className="text-orange-800/90">
              “I never thought learning calculus could be this fun! My Edu Voice Agent companion explains concepts in a way
              that finally makes sense. I love being able to ask questions out loud and get instant, clear answers.”
            </p>
            <span className="block mt-4 font-semibold text-orange-500">– Diya, University Student</span>
          </div>

          <div className="testimonial-card p-6 rounded-lg shadow bg-[#fff3e0] border border-orange-200">
            <p className="text-orange-800/90">
              “As a teacher, Edu Voice Agent has transformed my classroom. I created a custom AI assistant for my students,
              and now they’re more engaged and confident than ever. The progress tracking helps me support every learner.”
            </p>
            <span className="block mt-4 font-semibold text-orange-500">– Priya, High School Educator</span>
          </div>

          <div className="testimonial-card p-6 rounded-lg shadow bg-[#fff3e0] border border-orange-200">
            <p className="text-orange-800/90">
              “I use Edu Voice Agent to practice new languages and brush up on science topics. The voice chat feels so natural,
              and I can learn whenever I want—even on the go. Highly recommended for lifelong learners!”
            </p>
            <span className="block mt-4 font-semibold text-orange-500">– Spandhana, Lifelong Learner</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer py-8 text-center text-orange-500 text-sm bg-[#fff7ed] border-t border-orange-200">
        <div className="mb-2 flex items-center justify-center">
          <a href="https://github.com/pflame4200/" target="_blank" rel="noopener noreferrer" className="flex items-center">
            <Image src="/images/logo.png" alt="Edu Voice Agent Logo" width={48} height={48} className="inline-block align-middle mr-3 drop-shadow-lg" />
            <span className="align-middle font-extrabold text-2xl tracking-wide text-orange-600">Edu Voice Agent</span>
          </a>
        </div>
        <div>&copy; {new Date().getFullYear()} Edu Voice Agent. All rights reserved.</div>
      </footer>

      {/* Modal micro-interaction */}
      {modalOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalPulse} aria-hidden />
            <div className={styles.modalContent}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className={styles.modalIcon}>
                <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-lg font-semibold text-orange-700 mt-2">{modalText}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
