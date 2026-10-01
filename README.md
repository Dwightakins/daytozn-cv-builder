# DAYTOZN AI CV Builder

AI-powered CV builder that generates ATS-friendly CVs from user information.

## What it does

- Collects a candidate's details through a guided 8-step form
- Rewrites their experience into strong, professional CV language tailored to the target job
- Never invents experience, skills, employers, dates or metrics
- Produces a clean, single-column PDF that applicant tracking systems can read
- Emails the CV to the candidate as a PDF attachment
- Works for every occupation, from nurses and teachers to engineers and accountants

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router), TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com), [Framer Motion](https://motion.dev), [Aceternity UI](https://ui.aceternity.com) |
| AI | [Google Gemini](https://ai.google.dev) |
| PDF | [React PDF](https://react-pdf.org) |
| Email | [Resend](https://resend.com) |
| Validation | [Zod](https://zod.dev) |

## Features

- **Multi-step form:** 8 steps with inline validation, required and optional steps, a skip option for optional sections, and data kept across all navigation
- **AI rewriting:** turns plain notes into action-led bullet points and writes a professional summary from the candidate's own details
- **ATS optimization:** standard headings, single column, selectable text, no tables, images or hyphenation
- **Job tailoring:** matches real experience to a pasted job description and uses its terminology where accurate
- **Skills inference:** adds skills the candidate's work demonstrates (each verified against their input) and suggests related skills for the candidate to confirm with one click
- **Keyword analysis:** matched, transferable and missing keywords, plus suggested improvements, shown on screen and on an optional notes page
- **PDF download:** a clean, employer-ready CV, or a version with the notes page
- **Email delivery:** sends the CV to the candidate's inbox
- **Privacy:** the candidate's name, email and phone are never sent to the AI
- **Light and dark mode**, fully responsive

## Run locally

**Requirements:** Node.js 20 or later.

```bash
git clone https://github.com/Dwightakins/daytozn-cv-builder.git
cd daytozn-cv-builder
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Add these to `.env.local`. This file is gitignored and must never be committed.

| Name | What it is | Where to get it |
| --- | --- | --- |
| `GEMINI_API_KEY` | API key for Google Gemini, which writes the CV | [Google AI Studio](https://aistudio.google.com/apikey) |
| `RESEND_API_KEY` | API key for sending emails | [Resend dashboard → API Keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Sender address, e.g. `DAYTOZN <cv@yourdomain.com>`. Must be on a domain verified in Resend; Resend's `resend.dev` test sender only delivers to your own account email. | [Resend dashboard → Domains](https://resend.com/domains) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | *Optional.* WhatsApp number for the "Need help?" button, digits only (e.g. `2348012345678`) | Your business WhatsApp number |
| `GEMINI_MODEL` | *Optional.* Overrides the default Gemini model (`gemini-3.5-flash`) | [Gemini models list](https://ai.google.dev/gemini-api/docs/models) |
| `DEBUG_AI` | *Optional.* Set to `1` to log the AI payload, raw response and merge report outside development | — |

---

Built by **DWIGHT**.
