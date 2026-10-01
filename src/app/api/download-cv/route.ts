import { pdfFilename } from "@/lib/cv";
import { renderCvPdf } from "@/lib/cv-pdf";
import { finalCvSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = finalCvSchema.safeParse(body?.cv);
  if (!parsed.success) {
    return Response.json({ error: "Invalid CV data" }, { status: 400 });
  }

  // Notes page (ATS summary + suggestions) is opt-in so the default download is employer-ready.
  const includeNotes = body?.includeNotes === true;
  const pdf = await renderCvPdf(parsed.data, { includeNotes });
  const filename = pdfFilename(parsed.data.contact.fullName).replace(/\.pdf$/,includeNotes ? "_with_notes.pdf" : ".pdf");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
