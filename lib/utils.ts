// lib/utils.ts (unchanged except small export preservation comment)
// Source: uploaded my journey.txt. :contentReference[oaicite:6]{index=6}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { subjectsColors, voices } from "@/constants";
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Known mapping of possible DB subject values (legacy keys and new friendly labels)
 * to the canonical icon filename (without .svg).
 *
 * Add any extra variants you discover here (DB values or display strings).
 */
const SUBJECT_ICON_MAP: Record<string, string> = {
  maths: "maths",
  science: "science",
  language: "language",
  history: "history",
  coding: "coding",
  economics: "economics",
  "topic base lecture": "topic-base-lecture",
  "topic-base-lecture": "topic-base-lecture",
  "mock interview": "mock-interview",
  "mock-interview": "mock-interview",
  "ques ans prep": "ques-ans-prep",
  "ques-ans-prep": "ques-ans-prep",
  "learn language": "learn-language",
  "learn-language": "learn-language",
  meditation: "meditation",
  topic: "topic-base-lecture",
  interview: "mock-interview",
};

function slugify(str: string) {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function subjectToIconFilename(subject?: string) {
  if (!subject) return "default";
  const key = subject.toString().trim().toLowerCase();
  if (SUBJECT_ICON_MAP[key]) return SUBJECT_ICON_MAP[key];
  const s = slugify(key);
  if (SUBJECT_ICON_MAP[s]) return SUBJECT_ICON_MAP[s];
  if (s) return s;
  return "default";
}

export const getSubjectColor = (subject?: string) => {
  if (!subject) return "#F3F4F6";
  const direct = subjectsColors[subject as keyof typeof subjectsColors];
  if (direct) return direct;
  const slug = slugify(subject);
  const matchKey = Object.keys(subjectsColors).find(
    (k) => slugify(k) === slug
  );
  if (matchKey) return subjectsColors[matchKey as keyof typeof subjectsColors];
  return "#F3F4F6";
};

export const configureAssistant = (voice: string, style: string) => {
  const voiceId =
    voices[voice as keyof typeof voices][
      style as keyof (typeof voices)[keyof typeof voices]
    ] || "sarah";

  const vapiAssistant: CreateAssistantDTO = {
    name: "Companion",
    firstMessage:
      "Hello, let's start the session. Today we'll be talking about {{topic}}.",
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "en",
    },
    voice: {
      provider: "11labs",
      voiceId: voiceId,
      stability: 0.4,
      similarityBoost: 0.8,
      speed: 1,
      style: 0.5,
      useSpeakerBoost: true,
    },
    model: {
      provider: "openai",
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a highly knowledgeable tutor teaching a real-time voice session with a student. Your goal is to teach the student about the topic and subject.

                    Tutor Guidelines:
                    Stick to the given topic - {{ topic }} and subject - {{ subject }} and teach the student about it.
                    Keep the conversation flowing smoothly while maintaining control.
                    From time to time make sure that the student is following you and understands you.
                    Break down the topic into smaller parts and teach the student one part at a time.
                    Keep your style of conversation {{ style }}.
                    Keep your responses short, like in a real voice conversation.
                    Do not include any special characters in your responses - this is a voice conversation.
              `,
        },
      ],
    },
    clientMessages: [],
    serverMessages: [],
  };
  return vapiAssistant;
};
