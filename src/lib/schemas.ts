import { z } from "zod";

const required = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optional = (max = 200) => z.string().trim().max(max);
const year = (label: string) => z.string().trim().regex(/^\d{4}$/, `${label} must be a 4-digit year`);
const month = (label: string) =>
  z.string().trim().regex(/^\d{4}-\d{2}$/, `${label} is required`);

// ---------- Form input (what the user submits) ----------

export const personalSchema = z.object({
  fullName: required("Full name", 100),
  email: z.email("Enter a valid email address"),
  phone: required("Phone", 40),
  location: required("Location", 100),
  linkedin: optional(300),
  portfolio: optional(300),
  github: optional(300),
});

export const professionalSchema = z.object({
  jobTitle: required("Job title", 100),
  summary: optional(2000),
});

export const workEntrySchema = z
  .object({
    company: required("Company", 120),
    role: required("Role", 120),
    location: optional(100),
    startDate: month("Start date"),
    endDate: z.string().trim(),
    current: z.boolean(),
    bullets: z
      .array(z.string().trim().min(1).max(500, "A bullet point is too long"))
      .max(5, "Use at most 5 bullet points"),
  })
  .refine((e) => e.current || /^\d{4}-\d{2}$/.test(e.endDate), {
    message: "End date is required unless you still work here",
    path: ["endDate"],
  })
  .refine((e) => e.current || e.endDate >= e.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const educationEntrySchema = z.object({
  institution: required("Institution", 150),
  degree: required("Degree", 120),
  field: required("Field of study", 120),
  year: year("Graduation year"),
});

export const certificationEntrySchema = z.object({
  name: required("Certification name", 150),
  issuer: required("Issuer", 120),
  year: z.union([z.literal(""), year("Year")]),
});

export const projectEntrySchema = z.object({
  name: required("Project name", 120),
  description: required("Project description", 1000),
  url: optional(300),
});

export const skillsSchema = z
  .array(z.string().trim().min(1).max(60, "A skill is too long"))
  .min(1, "Add at least one skill")
  .max(50, "Use at most 50 skills");

export const cvFormSchema = z.object({
  personal: personalSchema,
  professional: professionalSchema,
  experience: z.array(workEntrySchema).min(1, "Add at least one position").max(10),
  education: z.array(educationEntrySchema).min(1, "Add at least one education entry").max(10),
  skills: skillsSchema,
  certifications: z.array(certificationEntrySchema).max(20),
  projects: z.array(projectEntrySchema).max(10),
  targetJobTitle: required("Target job title", 100),
  jobDescription: z.string().trim().max(8000, "Job description is too long (max 8,000 characters)"),
});

export type CvFormInput = z.infer<typeof cvFormSchema>;

// ---------- AI output (validated before use) ----------
// Lenient on shape (the model may omit empty sections); strict on what we actually use.

const text = z.string().catch("");
const list = z.array(z.string()).catch([]);

export const aiCvSchema = z.object({
  target_role: z
    .object({ title: text.default(""), industry: text.default(""), seniority: text.default("") })
    .prefault({}),
  professional_summary: z.string().trim().min(1),
  core_competencies: list.default([]),
  experience: z
    .array(
      z.object({
        job_title: text.default(""),
        company: text.default(""),
        bullets: list.default([]),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: text.default(""),
        description: text.default(""),
        technologies: list.default([]),
        bullets: list.default([]),
      }),
    )
    .default([]),
  technical_skills: z.record(z.string(), list).catch({}).default({}),
  ats_analysis: z
    .object({
      matched_keywords: list.default([]),
      transferable_keywords: list.default([]),
      missing_keywords: list.default([]),
    })
    .prefault({}),
  suggested_improvements: list.default([]),
  inferred_skills: z
    .array(z.object({ skill: text.default(""), category: text.default(""), evidence: text.default("") }))
    .catch([])
    .default([]),
  recommended_skills: z
    .array(z.object({ skill: text.default(""), reason: text.default("") }))
    .catch([])
    .default([]),
});

export type AiCv = z.infer<typeof aiCvSchema>;

// ---------- Final CV (AI content + user facts + contact details re-added in code) ----------

const s = (max: number) => z.string().max(max);

export const finalCvSchema = z.object({
  contact: z.object({
    fullName: z.string().trim().min(1).max(100),
    email: z.email(),
    phone: s(40),
    location: s(100),
    linkedin: s(300),
    portfolio: s(300),
    github: s(300),
    jobTitle: s(100),
  }),
  targetRole: z.object({ title: s(100), industry: s(100), seniority: s(60) }),
  summary: s(3000),
  coreCompetencies: z.array(s(80)).max(20),
  experience: z
    .array(
      z.object({
        role: s(120),
        company: s(120),
        location: s(100),
        startDate: s(20),
        endDate: s(20),
        bullets: z.array(s(600)).max(6),
        /** True when the user left bullets empty and these were drafted by AI for review. */
        aiSuggested: z.boolean().optional(),
      }),
    )
    .max(10),
  projects: z
    .array(
      z.object({
        name: s(120),
        description: s(1200),
        url: s(300),
        technologies: z.array(s(60)).max(15),
        bullets: z.array(s(600)).max(5),
      }),
    )
    .max(10),
  technicalSkills: z.array(z.object({ category: s(60), skills: z.array(s(60)).max(40) })).max(12),
  education: z
    .array(z.object({ institution: s(150), degree: s(120), field: s(120), year: s(10) }))
    .max(10),
  certifications: z.array(z.object({ name: s(150), issuer: s(120), year: s(10) })).max(20),
  /** For the user only: shown on screen and on the optional notes page, never in the CV body. */
  ats: z.object({
    matched: z.array(s(80)).max(40),
    transferable: z.array(s(80)).max(30),
    missing: z.array(s(80)).max(30),
  }),
  suggestions: z.array(s(400)).max(10),
  /** Related skills the candidate hasn't shown; only added to the CV if the user confirms them. */
  recommendedSkills: z.array(z.object({ skill: s(60), reason: s(300) })).max(10).default([]),
});

export type FinalCv = z.infer<typeof finalCvSchema>;

/** Turns Zod issues into readable messages, e.g. "Entry 2: Company is required". */
export function formatIssues(error: z.ZodError): string[] {
  const messages = error.issues.map((issue) => {
    const index = issue.path.find((p) => typeof p === "number");
    return typeof index === "number" ? `Entry ${index + 1}: ${issue.message}` : issue.message;
  });
  return [...new Set(messages)];
}
