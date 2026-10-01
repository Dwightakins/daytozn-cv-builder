import { Resend } from "resend";
import { pdfFilename } from "@/lib/cv";
import { renderCvPdf } from "@/lib/cv-pdf";
import { finalCvSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = finalCvSchema.safeParse(body?.cv);
  if (!parsed.success) {
    return Response.json({ error: "Invalid CV data" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return Response.json({ error: "Server is missing RESEND_API_KEY or RESEND_FROM_EMAIL" }, { status: 500 });
  }

  const cv = parsed.data;
  // The attached CV is clean (employer-ready). Suggestions go in the email body, for the candidate only.
  const pdf = await renderCvPdf(cv);
  const firstName = cv.contact.fullName.split(" ")[0] ?? "";
  const tipsHeading = "Suggestions to make it even stronger (for you only, not in the attached CV):";
  const tipsHtml = cv.suggestions.length
    ? `<p><strong>${tipsHeading}</strong></p><ul>${cv.suggestions.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
    : "";
  const tipsText = cv.suggestions.length ? `\n\n${tipsHeading}\n${cv.suggestions.map((t) => `- ${t}`).join("\n")}` : "";

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to: cv.contact.email,
    subject: "Your CV from DAYTOZN AI CV Builder",
    html: `<p>Hi ${escapeHtml(firstName)},</p><p>Your CV is attached as a PDF, ready to send to employers. Good luck with your application!</p>${tipsHtml}<p>DAYTOZN AI CV Builder</p>`,
    text: `Hi ${firstName},\n\nYour CV is attached as a PDF, ready to send to employers. Good luck with your application!${tipsText}\n\nDAYTOZN AI CV Builder`,
    attachments: [{ filename: pdfFilename(cv.contact.fullName), content: pdf }],
  });

  if (error) {
    console.error("Resend failed", error);
    return Response.json({ error: "Could not send the email. Please try again." }, { status: 502 });
  }

  return Response.json({ ok: true, sentTo: cv.contact.email });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
