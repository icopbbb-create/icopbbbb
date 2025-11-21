// app/api/sessions/for-companion/[companionId]/pdf/route.ts
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase";
import { PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Return a PDF of the most recent session for the given companion for the authenticated user.
 * Uses service-role server-side but enforces owner check.
 */

function pickTranscriptField(row: any) {
  if (!row) return null;
  if (row.transcript) return row.transcript;
  if (row.content) return row.content;
  if (row.text) return row.text;
  if (row.body) return row.body;
  if (Array.isArray(row.messages)) return row.messages.join("\n\n");
  for (const k of Object.keys(row)) {
    const v = row[k];
    if (typeof v === "string" && v.length > 20) return v;
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { companionId: string } }) {
  try {
    const companionId = params?.companionId;
    if (!companionId) {
      return NextResponse.json({ error: "Missing companionId" }, { status: 400 });
    }

    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated — no Clerk user" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    const { data, error } = await supabase
      .from("session_history")
      .select("*")
      .eq("companion_id", companionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("DB error in for-companion pdf route:", error);
      return NextResponse.json({ error: "Failed to fetch session for PDF (DB error)" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const transcriptText = pickTranscriptField(data) ?? "No transcript available.";
    const title = data.title ?? `Session for companion ${companionId}`;
    const subject = data.subject ?? "";
    const created_at = data.created_at ?? "";
    const duration = data.duration ?? "";

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSizeTitle = 14;
    const fontSizeText = 11;
    const margin = 40;
    let y = height - margin;

    // Title
    page.drawText(title, { x: margin, y: y - fontSizeTitle, size: fontSizeTitle, font });
    y -= fontSizeTitle + 8;

    // Meta
    if (subject) {
      page.drawText(`Subject: ${subject}`, { x: margin, y: y - fontSizeText, size: fontSizeText, font });
      y -= fontSizeText + 6;
    }
    if (created_at) {
      page.drawText(`Date: ${new Date(created_at).toLocaleString()}`, { x: margin, y: y - fontSizeText, size: fontSizeText, font });
      y -= fontSizeText + 6;
    }
    if (duration) {
      page.drawText(`Duration: ${duration}`, { x: margin, y: y - fontSizeText, size: fontSizeText, font });
      y -= fontSizeText + 8;
    }

    const wrapText = (text: string, maxChars = 120) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length > maxChars) {
          lines.push(cur.trim());
          cur = w;
        } else {
          cur += " " + w;
        }
      }
      if (cur.trim()) lines.push(cur.trim());
      return lines;
    };

    const lines = wrapText(transcriptText, 120);
    for (const line of lines) {
      if (y < margin + fontSizeText + 10) {
        page = pdfDoc.addPage();
        y = page.getSize().height - margin;
      }
      page.drawText(line, { x: margin, y: y - fontSizeText, size: fontSizeText, font });
      y -= fontSizeText + 4;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="companion-${companionId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Unexpected for-companion PDF route error:", err);
    return NextResponse.json({ error: String(err?.message ?? "Server error") }, { status: 500 });
  }
}
