import type { AiCv, CvFormInput, FinalCv } from "./schemas";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2022-03" -> "Mar 2022" */
export function formatMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${MONTHS[Number(match[2]) - 1] ?? ""} ${match[1]}`.trim();
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function pdfFilename(fullName: string): string {
  const safe = fullName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${safe || "My"}_CV.pdf`;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Trimmed, non-empty, de-duplicated (case-insensitive), capped. */
function tidy(items: string[], max: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = raw.trim();
    const key = norm(item);
    if (item && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out.slice(0, max);
}

const numbersIn = (text: string) => new Set(text.match(/\d+(?:[.,]\d+)?/g) ?? []);

/** True if every number in `text` also appears in the candidate's own words (blocks invented metrics). */
const numbersSupported = (text: string, source: Set<string>) => [...numbersIn(text)].every((n) => source.has(n));

/**
 * Builds the payload sent to the AI. Name, email, phone, location, LinkedIn, portfolio and
 * GitHub are left out entirely, and any copies of name/email/phone in free text are redacted.
 */
export function buildAiInput(form: CvFormInput) {
  const { fullName, email, phone } = form.personal;
  const redact = (text: string) => {
    let out = text;
    for (const secret of [email, phone]) {
      if (secret) out = out.split(secret).join("");
    }
    if (fullName) out = out.split(fullName).join("the candidate");
    return out.trim();
  };

  return {
    current_job_title: form.professional.jobTitle,
    target_role: { title: form.targetJobTitle },
    target_job_description: redact(form.jobDescription) || "(not provided)",
    candidate_summary: redact(form.professional.summary),
    experience: form.experience.map((e) => ({
      job_title: e.role,
      company: e.company,
      location: e.location,
      start_date: formatMonth(e.startDate),
      end_date: e.current ? "Present" : formatMonth(e.endDate),
      bullets: e.bullets.map(redact),
    })),
    education: form.education.map((e) => ({ degree: e.degree, field_of_study: e.field, institution: e.institution, graduation_year: e.year })),
    skills: form.skills,
    certifications: form.certifications.map((c) => ({ ...c })),
    projects: form.projects.map((p) => ({ name: p.name, description: redact(p.description), url: p.url })),
  };
}

/**
 * Combines the AI's writing with the user's facts. Factual fields (employers, titles, dates,
 * locations, education, certifications, project names/URLs) always come from the user; AI text is
 * checked for invented numbers, and skills/technologies must appear in the candidate's own words.
 */
export function mergeCv(form: CvFormInput, ai: AiCv, report: string[] = []): FinalCv {
  /** Filters items, recording anything a safeguard removed so it shows up in the debug log. */
  const keep = (items: string[], test: (x: string) => boolean, where: string, why: string) =>
    items.filter((x) => {
      const ok = test(x);
      if (!ok) report.push(`DROPPED ${where} (${why}): ${x}`);
      return ok;
    });

  // Everything the candidate wrote (deliberately excluding the job description).
  const corpus = norm(
    [
      form.professional.jobTitle,
      form.professional.summary,
      ...form.skills,
      ...form.experience.flatMap((e) => [e.role, e.company, ...e.bullets]),
      ...form.projects.flatMap((p) => [p.name, p.description]),
      ...form.education.flatMap((e) => [e.degree, e.field, e.institution]),
      ...form.certifications.flatMap((c) => [c.name, c.issuer]),
    ].join(" \n "),
  );
  const userSkills = new Set(form.skills.map(norm));
  const missing = new Set(ai.ats_analysis.missing_keywords.map(norm));
  const evidenced = (term: string) => {
    const t = norm(term);
    return !!t && !missing.has(t) && (userSkills.has(t) || corpus.includes(t));
  };

  const experience = form.experience.map((entry, i) => {
    const source = numbersIn([entry.role, entry.company, entry.startDate, entry.endDate, ...entry.bullets].join(" "));
    const aiBullets = tidy(ai.experience[i]?.bullets ?? [], 6);
    const base = {
      role: entry.role,
      company: entry.company,
      location: entry.location,
      startDate: formatMonth(entry.startDate),
      endDate: entry.current ? "Present" : formatMonth(entry.endDate),
    };

    if (entry.bullets.length === 0) {
      // User left bullets empty: accept up to 3 generic AI drafts without numbers, flagged for review.
      const suggested = keep(aiBullets, (b) => !/\d/.test(b), `experience[${i}] suggested bullet`, "contains a number").slice(0, 3);
      return { ...base, bullets: suggested, aiSuggested: suggested.length > 0 };
    }

    const supported = keep(aiBullets, (b) => numbersSupported(b, source), `experience[${i}] bullet`, "number not in candidate input");
    if (aiBullets.length < entry.bullets.length) report.push(`NOTE experience[${i}]: AI returned ${aiBullets.length} bullets for ${entry.bullets.length} provided`);
    if (supported.length === 0) report.push(`FALLBACK experience[${i}]: AI returned ${aiBullets.length} usable bullets; using the user's original wording`);
    return { ...base, bullets: supported.length > 0 ? supported : entry.bullets, aiSuggested: false };
  });

  const projects = form.projects.map((p, i) => {
    const out = ai.projects[i];
    const source = numbersIn(`${p.name} ${p.description}`);
    const description = out?.description.trim();
    return {
      name: p.name,
      description: description && numbersSupported(description, source) ? description : p.description,
      url: normalizeUrl(p.url),
      technologies: keep(tidy(out?.technologies ?? [], 12), evidenced, `projects[${i}] technology`, "not in candidate's own words"),
      bullets: keep(tidy(out?.bullets ?? [], 3), (b) => numbersSupported(b, source), `projects[${i}] bullet`, "number not in candidate input"),
    };
  });

  // Safe inference: a skill the AI says the candidate demonstrated (but didn't list) is accepted only
  // if the quoted evidence really appears in the candidate's own words.
  const evidenceFound = (quote: string) => {
    const q = norm(quote);
    if (!q) return false;
    if (corpus.includes(q)) return true;
    const words = q.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3);
    if (words.length < 2) return false;
    return words.filter((w) => corpus.includes(w)).length / words.length >= 0.8;
  };
  const inferred = new Map<string, { skill: string; category: string }>();
  for (const item of ai.inferred_skills) {
    const key = norm(item.skill);
    if (!key || key.length > 60 || missing.has(key)) continue;
    if (evidenceFound(item.evidence)) inferred.set(key, { skill: item.skill.trim(), category: item.category.trim() });
    else report.push(`DROPPED inferred skill (evidence not in candidate input): ${item.skill} <- "${item.evidence}"`);
  }
  const supportedSkill = (sk: string) => evidenced(sk) || inferred.has(norm(sk));

  // Technical skills: AI's categories, keeping listed + evidenced + verified inferred skills.
  // Verified inferred skills the AI didn't place are added to their category; anything the user
  // listed that the AI left out goes under "Additional Skills" so no real skill is lost.
  const technicalSkills: FinalCv["technicalSkills"] = [];
  const placed = new Set<string>();
  const addToCategory = (category: string, skill: string) => {
    const name = category.trim().slice(0, 60) || "Additional Skills";
    const group = technicalSkills.find((g) => norm(g.category) === norm(name));
    if (group) group.skills.push(skill);
    else technicalSkills.push({ category: name, skills: [skill] });
    placed.add(norm(skill));
  };
  for (const [category, skills] of Object.entries(ai.technical_skills)) {
    const kept = keep(tidy(skills, 30), (sk) => supportedSkill(sk) && !placed.has(norm(sk)), `skill "${category}"`, "not evidenced, missing, or duplicate");
    kept.forEach((sk) => addToCategory(category, sk));
  }
  for (const [key, item] of inferred) {
    if (!placed.has(key)) addToCategory(item.category, item.skill);
  }
  const leftover = form.skills.filter((sk) => !placed.has(norm(sk)));
  if (leftover.length > 0) {
    technicalSkills.push({ category: technicalSkills.length > 0 ? "Additional Skills" : "Skills", skills: tidy(leftover, 40) });
  }

  return {
    contact: {
      fullName: form.personal.fullName,
      email: form.personal.email,
      phone: form.personal.phone,
      location: form.personal.location,
      linkedin: normalizeUrl(form.personal.linkedin),
      portfolio: normalizeUrl(form.personal.portfolio),
      github: normalizeUrl(form.personal.github),
      jobTitle: form.professional.jobTitle,
    },
    targetRole: {
      title: form.targetJobTitle,
      industry: ai.target_role.industry.trim().slice(0, 100),
      seniority: ai.target_role.seniority.trim().slice(0, 60),
    },
    summary: ai.professional_summary.trim(),
    coreCompetencies: keep(tidy(ai.core_competencies, 12), (c) => !missing.has(norm(c)), "core competency", "listed as missing"),
    experience,
    projects: projects.slice(0, 10),
    technicalSkills: technicalSkills.slice(0, 12),
    education: form.education.map((e) => ({ ...e })),
    certifications: form.certifications.map((c) => ({ ...c })),
    ats: {
      matched: tidy(ai.ats_analysis.matched_keywords, 30),
      transferable: tidy(ai.ats_analysis.transferable_keywords, 20),
      missing: tidy(ai.ats_analysis.missing_keywords, 20),
    },
    suggestions: tidy(ai.suggested_improvements, 6),
    recommendedSkills: (() => {
      const onCv = new Set([...placed, ...userSkills]);
      const seen = new Set<string>();
      return ai.recommended_skills
        .filter((r) => {
          const key = norm(r.skill);
          if (!key || key.length > 60 || onCv.has(key) || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 8)
        .map((r) => ({ skill: r.skill.trim(), reason: r.reason.trim().slice(0, 300) }));
    })(),
  };
}
