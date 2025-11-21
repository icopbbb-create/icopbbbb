// app/api/sessions/[id]/notes/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";
import { saveSessionNotes } from "@/lib/server/companion.actions";
import { revalidatePath } from "next/cache";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET; // optional dev-only header bypass

function supabaseAdmin() {
  return getSupabaseServiceRole();
}

/**
 * Try to fetch transcript text for a sessionId.
 * - First: transcripts table (ordered by created_at)
 * - Fallback: session_history.transcript field (single row)
 */
async function fetchTranscriptText(sessionId: string): Promise<string | null> {
  const supabase = supabaseAdmin();

  try {
    const { data: rows, error: tErr } = await supabase
      .from("transcripts")
      .select("role, text, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!tErr && Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: any) => `${(r.role || "speaker")}: ${(r.text || "").trim()}`).join("\n");
    }
  } catch (err) {
    console.warn("transcripts table lookup failed", err);
  }

  // fallback to session_history.transcript
  try {
    const { data: shRow, error: sErr } = await supabase
      .from("session_history")
      .select("transcript")
      .eq("id", sessionId)
      .limit(1)
      .single();

    if (!sErr && shRow?.transcript) {
      return typeof shRow.transcript === "string" ? shRow.transcript : JSON.stringify(shRow.transcript);
    }
  } catch (err) {
    console.warn("session_history transcript lookup failed", err);
  }

  return null;
}

/**
 * Prompt construction: ask model to return strict JSON
 */
function makePrompt(transcriptText: string, topicHint?: string) {
  const topicLine = topicHint ? `Topic: ${topicHint}\n` : "";
  return [
    {
      role: "system",
      content:
        "You are an assistant that MUST return a single valid JSON object only. " +
        'Return exactly: {"summary":"...","actions":["..."],"feedback":"..."} ' +
        "SUMMARY REQUIREMENTS: Write a long, rich, deeply detailed summary (minimum 6–10 well-developed paragraphs). " +
        "Add examples, explanations, and elaboration even if the transcript is short. " +
        "Expand the ideas using reasonable assumptions strictly based on the transcript + topic. " +
        "Make the summary engaging, structured, and pleasant to read, using bullet points and emojis where appropriate. " +
        "ACTIONS: Return 5–7 short, clear action steps (each 8–14 words). " +
        "FEEDBACK: Return 3–5 concise improvement suggestions for the learner. " +
        "Always return valid JSON and nothing else.",
    },
    {
      role: "user",
      content: `${topicLine}Transcript:\n${transcriptText}\n\nReturn ONLY the JSON object.`,
    },
  ];
}

/* -------------------
   GET: return saved notes (if any)
   ------------------- */
export async function GET(_: Request, { params }: { params: { id?: string } }) {
  const sessionId = params?.id;
  if (!sessionId) {
    return NextResponse.json({ message: "Missing session id" }, { status: 400 });
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("session_history")
      .select("metadata")
      .eq("id", sessionId)
      .limit(1)
      .single();

    if (error || !data) {
      // If session not found or DB error, return safe empty result (client handles nulls)
      return NextResponse.json({ notes: null, feedback: null, generated_at: null }, { status: 200 });
    }

    const metaRaw = data?.metadata ?? {};
    let meta: any = {};
    try {
      meta = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
    } catch {
      meta = metaRaw ?? {};
    }

    return NextResponse.json({
      notes: meta.ai_notes ?? null,
      feedback: meta.ai_feedback ?? null,
      generated_at: meta.ai_generated_at ?? null,
    }, { status: 200 });
  } catch (err: any) {
    console.error("GET /notes error", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/* -------------------
   POST: generate notes, persist, revalidate
   ------------------- */
export async function POST(req: Request, { params }: { params: { id?: string } }) {
  const sessionId = params?.id;
  if (!sessionId) {
    return NextResponse.json({ message: "Missing session id" }, { status: 400 });
  }

  // detect internal secret header (for curl/dev testing)
  const headerSecret = req.headers.get("x-internal-secret") ?? "";
  const isInternal = Boolean(INTERNAL_SECRET && headerSecret && headerSecret === INTERNAL_SECRET);

  // If not internal, require authenticated user (Clerk)
  let authenticatedUserId: string | null = null;
  if (!isInternal) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }
    authenticatedUserId = userId;
  }

  try {
    // Enforce ownership: if session exists and belongs to someone else, block.
    if (!isInternal && authenticatedUserId) {
      try {
        const supabase = supabaseAdmin();
        const { data: ownerCheck, error: ownerErr } = await supabase
          .from("session_history")
          .select("id, user_id")
          .eq("id", sessionId)
          .limit(1)
          .single();

        if (ownerErr && ownerErr.code !== "PGRST116") {
          // some DB error; log and continue (we'll still try to proceed carefully)
          console.warn("Owner check error for session notes:", ownerErr);
        }

        if (ownerCheck && ownerCheck.user_id && ownerCheck.user_id !== authenticatedUserId) {
          // session belongs to another user — deny
          return NextResponse.json({ message: "Forbidden - session does not belong to authenticated user" }, { status: 403 });
        }
        // If ownerCheck is null (no row), we allow fallback insert later which will set user_id to authenticatedUserId
      } catch (ownerCheckErr) {
        console.warn("Failed to perform owner check for notes POST:", ownerCheckErr);
      }
    }

    let transcriptText = await fetchTranscriptText(sessionId);

    // If transcript is missing, *do not fail immediately*.
    // Try to extract a topic hint from the session_history metadata or companion name (best-effort),
    // and then generate a long summary based on that topic even if the user didn't speak much.
    let topicHint: string | undefined = undefined;
    if (!transcriptText) {
      try {
        const supabase = supabaseAdmin();
        const { data: shRow, error: shErr } = await supabase
          .from("session_history")
          .select("companion_id, metadata")
          .eq("id", sessionId)
          .limit(1)
          .single();

        if (!shErr && shRow) {
          const metaRaw = shRow.metadata ?? {};
          let meta: any = {};
          try {
            meta = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
          } catch {
            meta = metaRaw ?? {};
          }
          // check common places for a topic hint
          topicHint = meta?.topic ?? meta?.subject ?? undefined;

          // If companion_id present, try to fetch companion title (best-effort; ignore errors)
          if (!topicHint && shRow.companion_id) {
            try {
              const { data: cRow } = await supabase.from("companions").select("name, topic").eq("id", shRow.companion_id).limit(1).single();
              if (cRow) {
                topicHint = cRow.topic ?? cRow.name ?? undefined;
              }
            } catch (e) {
              // ignore companion lookup failures
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // Construct a fallback transcriptText that prompts the model to produce a long, helpful summary
      const fallbackTopicText = topicHint ? `Topic: ${topicHint}\n` : "";
      transcriptText =
        `${fallbackTopicText}No real transcript is available for this session. ` +
        `Please produce a long, helpful, engaging, and practical summary for a learner on the above topic. ` +
        `Include actionable suggestions and feedback even if the learner spoke little or not at all.`;
    }

    // Bound transcript size to avoid token issues
    const MAX_CHARS = 12000;
    const trimmedTranscript = transcriptText.length > MAX_CHARS ? transcriptText.slice(-MAX_CHARS) : transcriptText;

    const messages = makePrompt(trimmedTranscript, topicHint);

    let summary = "";
    let feedback = "";
    let usedFallback = false;

    // Attempt OpenAI only if key exists
    if (OPENAI_API_KEY) {
      try {
        const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            max_tokens: 800,
            temperature: 0.2,
          }),
        });

        const respText = await openaiResp.text().catch(() => "");

        if (!openaiResp.ok) {
          console.warn("OpenAI API returned non-OK", { status: openaiResp.status, body: respText });
          throw { openai_status: openaiResp.status, body: respText };
        }

        const openaiJson = JSON.parse(respText || "{}");
        const assistantText = openaiJson?.choices?.[0]?.message?.content ?? openaiJson?.choices?.[0]?.text ?? "";

        // Try parsing JSON from assistant
        let parsed: any = null;
        try {
          parsed = JSON.parse(assistantText);
        } catch {
          const m = String(assistantText).match(/\{[\s\S]*\}/);
          if (m) {
            try {
              parsed = JSON.parse(m[0]);
            } catch {}
          }
        }

        if (parsed && (parsed.summary || parsed.actions || parsed.feedback)) {
          summary = String(parsed.summary ?? "").trim();
          feedback = String(parsed.feedback ?? "").trim();
        } else {
          // If assistant returned plain text, use as summary
          summary = String(assistantText).trim().slice(0, 2000);
          feedback = parsed?.feedback ? String(parsed.feedback) : "No explicit feedback from model.";
        }
      } catch (openaiErr) {
        console.warn("OpenAI call failed — falling back to local summarizer", openaiErr);
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    // Local fallback summarizer if needed or no summary returned
    if (usedFallback || !summary) {
      const cleaned = trimmedTranscript.replace(/\r+/g, " ").replace(/\n+/g, " ").trim();
      const sentences = cleaned.split(/(?<=[.?!])\s+/).filter(Boolean);

      if (sentences.length >= 3) {
        summary = sentences.slice(0, 3).join(" ");
      } else {
        const top = [...sentences].sort((a, b) => b.length - a.length).slice(0, 3);
        summary = top.join(" ") || cleaned.slice(0, 1200);
      }

      // Make fallback a bit more helpful when the text was our "no transcript" prompt
      if (cleaned.toLowerCase().includes("no real transcript is available")) {
        summary =
          `Here's a helpful summary on ${topicHint ?? "the topic"} based on the available context. ` +
          (summary ? `${summary} ` : "") +
          "Even with little spoken content, here are practical points and guidance a learner would find useful.";
      }

      // Simple action extraction
      const verbMatches = cleaned.match(/\b(practice|review|try|remember|repeat|focus|ask|clarify|improve|exercise|revise)\b/gi) ?? [];
      const uniq = Array.from(new Set(verbMatches || [])).slice(0, 5);
      const actions = uniq.length ? uniq.map((v) => `Try to ${String(v).toLowerCase()} more`) : [];
      feedback = actions.length ? `Suggested actions:\n- ${actions.join("\n- ")}` : "No explicit action items found; key points extracted.";
    }

    // Persist results
    const supabase = supabaseAdmin();

    if (isInternal) {
      const { data: row, error: fetchErr } = await supabase
        .from("session_history")
        .select("id, metadata")
        .eq("id", sessionId)
        .limit(1)
        .single();

      if (fetchErr || !row) {
        console.error("Internal save: session not found", fetchErr);
        return NextResponse.json({ message: "Session not found for internal save" }, { status: 404 });
      }

      const prevMetaRaw = row.metadata ?? {};
      let prevMeta: any = {};
      try {
        prevMeta = typeof prevMetaRaw === "string" ? JSON.parse(prevMetaRaw) : prevMetaRaw;
      } catch {
        prevMeta = prevMetaRaw ?? {};
      }

      const newMeta = {
        ...(prevMeta || {}),
        ai_notes: summary,
        ai_feedback: feedback,
        ai_generated_at: new Date().toISOString(),
      };

      const { error: updErr } = await supabase.from("session_history").update({ metadata: newMeta }).eq("id", sessionId).limit(1);

      if (updErr) {
        console.error("Internal save failed", updErr);
        return NextResponse.json({ message: "Internal save failed", detail: String(updErr) }, { status: 500 });
      }
    } else {
      // normal flow: ensure session row exists (robustness)
      try {
        const { data: existing, error: checkErr } = await supabase
          .from("session_history")
          .select("id, user_id")
          .eq("id", sessionId)
          .limit(1)
          .single();

        if (checkErr && checkErr.code !== "PGRST116") {
          // PGRST116 is single() no rows — ignore; any other error we log
          console.warn("session existence check error", checkErr);
        }

        if (existing) {
          // If row exists but user_id is present and not equal to authenticated user, deny
          if (existing.user_id && existing.user_id !== authenticatedUserId) {
            return NextResponse.json({ message: "Forbidden - session belongs to another user" }, { status: 403 });
          }
        } else {
          // Insert a minimal session_history row so notes can be attached.
          // companion_id is intentionally null here as a safe fallback.
          const insertPayload: any = {
            id: sessionId,
            companion_id: null,
            user_id: authenticatedUserId ?? null,
            transcript: transcriptText ?? null,
            metadata: {},
          };

          const { data: insData, error: insErr } = await supabase
            .from("session_history")
            .insert([insertPayload])
            .select();

          if (insErr) {
            console.error("Failed to insert fallback session_history row", insErr);
            // Don't block the notes save — attempt to continue but warn client
          } else {
            // inserted successfully (insData[0] available)
          }
        }

        // Verify ownership again before calling helper that may update metadata
        if (authenticatedUserId) {
          const { data: verifyRow, error: verifyErr } = await supabase
            .from("session_history")
            .select("id, user_id")
            .eq("id", sessionId)
            .limit(1)
            .single();

          if (verifyErr && verifyErr.code !== "PGRST116") {
            console.warn("Ownership verify error before saveSessionNotes:", verifyErr);
          }

          if (verifyRow && verifyRow.user_id && verifyRow.user_id !== authenticatedUserId) {
            return NextResponse.json({ message: "Forbidden - cannot save notes for another user's session" }, { status: 403 });
          }
        }

        // Now call your existing helper to persist notes (it may update metadata)
        if (typeof saveSessionNotes === "function") {
          await saveSessionNotes(sessionId, summary, feedback, { userId: authenticatedUserId });
        } else {
          console.warn("saveSessionNotes helper missing — cannot persist notes for non-internal request");
          return NextResponse.json(
            { message: "Server not configured to save notes (saveSessionNotes missing)" },
            { status: 500 }
          );
        }
      } catch (saveErr: any) {
        console.error("saveSessionNotes failed (or fallback insert failed)", saveErr);
        return NextResponse.json({ message: "Failed to save notes", detail: String(saveErr) }, { status: 500 });
      }
    }

    // revalidate pages showing notes
    try {
      revalidatePath(`/sessions/${sessionId}`);
      revalidatePath("/my-journey");
      revalidatePath("/");
    } catch (e) {
      // ignore revalidation errors in some dev setups
    }

    return NextResponse.json({ ok: true, notes: summary, feedback, fallback: usedFallback, generated_at: new Date().toISOString() }, { status: 200 });
  } catch (err: any) {
    console.error("POST /notes unhandled error", err);
    return NextResponse.json({ message: "Server error", detail: String(err) }, { status: 500 });
  }
}
