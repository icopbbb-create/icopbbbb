EDU VOICE AGENT
🎙️ AI-Powered Voice Learning Intelligence Platform

Created by: DAVAL LP



Overview

Edu Voice Agent is a next-generation, voice-driven AI tutoring system designed to help learners interact with intelligent companions through natural conversation.

It combines voice recognition, AI agents, automatic transcripts, and smart feedback, creating a futuristic learning experience.


| Feature                                    | Description                                                |
| ------------------------------------------ | ---------------------------------------------------------- |
| 🎤 **Voice Conversations**                 | Speak directly with AI tutors through real-time voice.     |
| 🧠 **AI-Generated Notes**                  | Summaries, action items, feedback, and learning insights.  |
| 📝 **Automatic Transcriptions**            | Every session is saved in Supabase for later review.       |
| 📚 **Companion Library**                   | Choose from intelligent AI companions across subjects.     |
| 🔒 **Secure Auth**                         | Powered by Clerk with full RLS data isolation in Supabase. |
| 🎨 **Cinematic UI / Animated Backgrounds** | Neon gradient waves, particle galaxy, matrix rain.         |
| 📱 **Responsive by Design**                | Perfect on desktop or mobile.                              |
| ⚡ **Fast Deployment**                      | Built for Vercel (Next.js App Router).                     |







Tech Stack

Next.js 15 (App Router)

Supabase (DB + Auth + RLS)

Clerk Authentication

ShadCN UI

OpenAI / VAPI Voice Integration

Sentry Monitoring

TailwindCSS

TypeScript



                        ┌──────────────────────────┐
                        │        User Browser       │
                        │  (Voice + UI + Animations)│
                        └─────────────┬────────────┘
                                      │
                                      ▼
                   ┌─────────────────────────────────────┐
                   │           Next.js 15 API             │
                   │ (App Router, Server Components)      │
                   └─────────────────────┬─────────────────┘
                                         │
               ┌─────────────────────────┼─────────────────────────┐
               ▼                         ▼                         ▼
     ┌────────────────┐     ┌────────────────────┐     ┌──────────────────────┐
     │  Supabase DB   │     │  Clerk Auth Layer  │     │   OpenAI + VAPI Voice │
     │ Transcripts,   │     │ Secure User Tokens │     │  Streaming Responses  │
     │ Session Notes  │     │   Sessions, RLS    │     │   Realtime Speech     │
     └────────────────┘     └────────────────────┘     └──────────────────────┘





Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/pflame4200/education
cd education


Install Dependencies
npm install


Create .env.local

Add the required environment variables:     
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=REDACTED
SUPABASE_SERVICE_ROLE_KEY=REDACTED

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=REDACTED
CLERK_SECRET_KEY=REDACTED

NEXT_PUBLIC_SENTRY_DSN=REDACTED
SENTRY_AUTH_TOKEN=REDACTED
SENTRY_PROJECT=REDACTED
SENTRY_ORG=REDACTED

Start Development Server
npm run dev





Deploy to Vercel
1. Install Vercel CLI
npm i -g vercel
vercel login

2. Deploy
vercel
vercel --prod

3. Add Environment Variables on Vercel Dashboard

(Required or you get Missing env: NEXT_PUBLIC_SUPABASE_URL)





Project Structure
app/
components/
lib/
public/
types/
constants/

🛡️ License

This project is Proprietary & Confidential.
Users may not copy, modify, distribute, reverse-engineer, or reuse the source code.

Full license: LICENSE

📆 Roadmap

 iOS / Android Mobile App

 AI Companion Customizer

 Full Offline Voice Mode

 Teacher Dashboard

 Analytics & Student Reports

 Multi-language Voice Tutors


 FAQ
Can users copy or modify the code?

❌ No — the project uses a Proprietary “All Rights Reserved” License.

Can I use my own OpenAI API key?

Yes — set your own key in .env.local.

Can I add more companions?

Yes — add them via the companion creation UI or database seed.


