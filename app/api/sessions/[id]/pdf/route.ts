// app/api/sessions/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getSupabaseServiceRole } from "@/lib/supabase";
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function GET(req: Request, context: { params: { id: string } }) {
  try {
    const sessionId = context?.params?.id;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 });
    }

    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    const { data, error } = await supabase
      .from("session_history")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error fetching session:", error);
      return NextResponse.json({ error: error.message ?? "DB error" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Session not found or not owned by user" }, { status: 404 });
    }

    const transcript =
      data?.transcript ??
      data?.text ??
      data?.content ??
      "No transcript available.";

    // Create PDF (preserve your visual style)
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    let y = height - 40;

    page.drawText("Session Transcript", { x: 40, y, size: 14, font });
    y -= 20;

    const wrap = (t: string, len = 90) => {
      const words = t.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        if ((line + w).length > len) {
          lines.push(line.trim());
          line = w + " ";
        } else line += w + " ";
      }
      if (line) lines.push(line.trim());
      return lines;
    };

    const lines = wrap(String(transcript));
    for (const line of lines) {
      if (y < 60) {
        // add a new page and reset y
        page = pdfDoc.addPage();
        y = page.getSize().height - 40;
      }
      y -= 14;
      page.drawText(line, { x: 40, y, size: fontSize, font });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="session-${sessionId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("GET /api/sessions/[id]/pdf error:", err);
    return NextResponse.json({ error: String(err?.message ?? "Server error") }, { status: 500 });
  }
}
