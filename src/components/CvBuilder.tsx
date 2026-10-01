"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { pdfFilename } from "@/lib/cv";
import { cn } from "@/lib/utils";
import {
  certificationEntrySchema,
  cvFormSchema,
  educationEntrySchema,
  formatIssues,
  personalSchema,
  professionalSchema,
  projectEntrySchema,
  skillsSchema,
  workEntrySchema,
  type CvFormInput,
  type FinalCv,
} from "@/lib/schemas";
import { CvNotes, CvPreview } from "./CvPreview";
import { AddButton, Card, FieldError, TextArea, TextField, controlClass } from "./fields";

// ---------- Form state ----------

type Work = { company: string; role: string; location: string; startDate: string; endDate: string; current: boolean; bullets: string[] };
type Education = { institution: string; degree: string; field: string; year: string };
type Certification = { name: string; issuer: string; year: string };
type Project = { name: string; description: string; url: string };

type FormState = {
  personal: { fullName: string; email: string; phone: string; location: string; linkedin: string; portfolio: string; github: string };
  professional: { jobTitle: string; summary: string };
  experience: Work[];
  education: Education[];
  skillsText: string;
  certifications: Certification[];
  projects: Project[];
  targetJobTitle: string;
  jobDescription: string;
};

type ListKey = "experience" | "education" | "certifications" | "projects";

const emptyWork = (): Work => ({ company: "", role: "", location: "", startDate: "", endDate: "", current: false, bullets: ["", "", ""] });
const emptyEducation = (): Education => ({ institution: "", degree: "", field: "", year: "" });
const emptyCertification = (): Certification => ({ name: "", issuer: "", year: "" });
const emptyProject = (): Project => ({ name: "", description: "", url: "" });

const initialState: FormState = {
  personal: { fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "", github: "" },
  professional: { jobTitle: "", summary: "" },
  experience: [emptyWork()],
  education: [emptyEducation()],
  skillsText: "",
  certifications: [],
  projects: [],
  targetJobTitle: "",
  jobDescription: "",
};

/** True when every text field of an entry is blank, so the entry can be ignored. */
const isBlank = (entry: object) =>
  Object.values(entry).every((v) =>
    typeof v === "string" ? !v.trim() : Array.isArray(v) ? v.every((s) => !String(s).trim()) : true,
  );

const cleanWork = (e: Work) => ({
  ...e,
  endDate: e.current ? "" : e.endDate,
  bullets: e.bullets.map((b) => b.trim()).filter(Boolean),
});

const parseSkills = (text: string) => text.split(",").map((x) => x.trim()).filter(Boolean);

function toPayload(s: FormState): CvFormInput {
  return {
    personal: s.personal,
    professional: s.professional,
    experience: s.experience.filter((e) => !isBlank(e)).map(cleanWork),
    education: s.education.filter((e) => !isBlank(e)),
    skills: parseSkills(s.skillsText),
    certifications: s.certifications.filter((c) => !isBlank(c)),
    projects: s.projects.filter((p) => !isBlank(p)),
    targetJobTitle: s.targetJobTitle,
    jobDescription: s.jobDescription,
  };
}

// ---------- Validation (per field, so errors can sit under each input) ----------

type FieldErrors = Record<string, string>;

/** Records the first error per field under keys like "personal.email" or "experience.0.company". */
function collect(result: z.ZodSafeParseResult<unknown>, prefix: string, into: FieldErrors, flat = false) {
  if (result.success) return;
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    const key = flat || field === undefined ? prefix : `${prefix}.${String(field)}`;
    into[key] ??= issue.message;
  }
}

/** Validates each non-blank entry, keyed by its position in the form (blank entries are skipped). */
function collectList<T extends object>(items: T[], key: ListKey, schema: z.ZodType, into: FieldErrors, clean = (x: T): unknown => x) {
  items.forEach((item, i) => {
    if (!isBlank(item)) collect(schema.safeParse(clean(item)), `${key}.${i}`, into);
  });
}

function validateStep(step: number, s: FormState): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case 0: collect(personalSchema.safeParse(s.personal), "personal", errors); break;
    case 1: collect(professionalSchema.safeParse(s.professional), "professional", errors); break;
    case 2:
      if (!s.experience.some((e) => !isBlank(e))) errors.experience = "Add at least one position";
      collectList(s.experience, "experience", workEntrySchema, errors, cleanWork);
      break;
    case 3:
      if (!s.education.some((e) => !isBlank(e))) errors.education = "Add at least one education entry";
      collectList(s.education, "education", educationEntrySchema, errors);
      break;
    case 4: collect(skillsSchema.safeParse(parseSkills(s.skillsText)), "skills", errors, true); break;
    case 5: collectList(s.certifications, "certifications", certificationEntrySchema, errors); break;
    case 6: collectList(s.projects, "projects", projectEntrySchema, errors); break;
    case 7:
      collect(cvFormSchema.shape.targetJobTitle.safeParse(s.targetJobTitle), "targetJobTitle", errors, true);
      collect(cvFormSchema.shape.jobDescription.safeParse(s.jobDescription), "jobDescription", errors, true);
      break;
  }
  return errors;
}

// ---------- Steps ----------

const STEPS = [
  { title: "Personal info", hint: "How employers can reach you. These details are never sent to the AI.", optional: false },
  { title: "Professional info", hint: "Your current or most recent title. Leave the summary blank and AI will write one from your details.", optional: false },
  { title: "Work experience", hint: "Add at least one role. Bullet points are optional: write your own in plain language, or leave them empty and AI will suggest some for you to check.", optional: false },
  { title: "Education", hint: "Add at least one degree, diploma, or other qualification.", optional: false },
  { title: "Skills", hint: "Separate skills with commas.", optional: false },
  { title: "Certifications", hint: "Optional. Skip this step and the section is left off your CV.", optional: true },
  { title: "Projects", hint: "Optional. Skip this step and the section is left off your CV.", optional: true },
  { title: "Target role", hint: "The job you are applying for. Paste the job advert too, and AI will match your real experience to it.", optional: false },
];

/** Data each optional step clears when skipped. */
const SKIP_CLEARS: Partial<Record<number, Partial<FormState>>> = {
  5: { certifications: [] },
  6: { projects: [] },
};

const isValid = (i: number, s: FormState) => Object.keys(validateStep(i, s)).length === 0;

const hasData = (i: number, s: FormState) =>
  i === 5 ? s.certifications.some((c) => !isBlank(c)) : i === 6 ? s.projects.some((p) => !isBlank(p)) : true;

/** First required step that isn't finished yet: the furthest required step the user may open. */
function requiredFrontier(s: FormState, visited: Set<number>) {
  const i = STEPS.findIndex((st, idx) => !st.optional && !(visited.has(idx) && isValid(idx, s)));
  return i === -1 ? STEPS.length - 1 : i;
}

type StepStatus = "current" | "completed" | "skipped" | "open" | "locked";

function stepStatus(i: number, step: number, s: FormState, visited: Set<number>, skipped: Set<number>): StepStatus {
  if (i === step) return "current";
  if (STEPS[i].optional) {
    if (skipped.has(i) && !hasData(i, s)) return "skipped";
    if (visited.has(i) && hasData(i, s) && isValid(i, s)) return "completed";
    return "open"; // optional steps can always be opened, even ahead of time
  }
  if (visited.has(i) && isValid(i, s)) return "completed";
  if (visited.has(i) || i === requiredFrontier(s, visited)) return "open";
  return "locked";
}

// Forward: current step exits left, next enters from the right. Back: the reverse.
const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};
const slideTransition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Step circles: completed (check), skipped (dash), current (ringed), locked (grey, disabled). */
function Stepper({ statuses, onSelect }: { statuses: StepStatus[]; onSelect: (i: number) => void }) {
  return (
    <ol className="flex items-center pb-5" aria-label="Form progress">
      {STEPS.map((s, i) => {
        const status = statuses[i];
        const clickable = status !== "current" && status !== "locked";
        const label =
          status === "completed" ? `Step ${i + 1}: ${s.title} (completed)`
          : status === "skipped" ? `Step ${i + 1}: ${s.title} (skipped)`
          : status === "current" ? `Step ${i + 1}: ${s.title} (current)`
          : status === "locked" ? `Step ${i + 1}: ${s.title} (complete earlier steps first)`
          : `Step ${i + 1}: ${s.title}${s.optional ? " (optional)" : ""}`;
        return (
          <li key={s.title} className={cn("relative flex items-center", i < STEPS.length - 1 && "flex-1")}>
            <motion.button
              type="button"
              onClick={() => onSelect(i)}
              disabled={!clickable}
              aria-current={status === "current" ? "step" : undefined}
              aria-label={label}
              title={label}
              whileHover={clickable ? { scale: 1.08 } : undefined}
              whileTap={clickable ? { scale: 0.94 } : undefined}
              className={cn(
                "relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors duration-200 sm:h-9 sm:w-9",
                status === "completed" && "bg-foreground text-background hover:opacity-85",
                status === "skipped" && "border border-dashed border-line-strong bg-subtle text-muted hover:border-foreground hover:text-foreground",
                status === "current" && "cursor-default border-2 border-foreground bg-surface text-foreground ring-4 ring-foreground/10",
                status === "open" && "border border-line-strong bg-background text-muted hover:border-foreground hover:text-foreground",
                status === "locked" && "border border-line bg-background text-muted/70 opacity-50",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={status === "completed" ? "check" : status === "skipped" ? "dash" : "num"}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="grid place-items-center"
                >
                  {status === "completed" ? (
                    <CheckIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : status === "skipped" ? (
                    <span className="block h-[2px] w-3.5 rounded-full bg-current" aria-hidden />
                  ) : (
                    i + 1
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            {status === "skipped" ? (
              <span className="absolute top-full left-4 mt-1 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap text-muted sm:left-[18px]">
                Skipped
              </span>
            ) : null}
            {i < STEPS.length - 1 ? (
              // Connector fills with a spring once the step before it is done (completed or skipped).
              <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-line sm:mx-2" aria-hidden>
                <motion.div
                  className={cn("h-full origin-left", status === "skipped" ? "bg-line-strong" : "bg-foreground")}
                  initial={false}
                  animate={{ scaleX: status === "completed" || status === "skipped" ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

const Spinner = () => (
  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />
);

// ---------- Component ----------

const CLIENT_TIMEOUT_MS = 75_000;

/** Friendly progress text while the AI works; the server falls back to other models if one is busy. */
function generationStatus(seconds: number) {
  if (seconds < 8) return "Analysing your experience and the target role...";
  if (seconds < 20) return "Writing your summary and bullet points...";
  if (seconds < 40) return "The AI is busier than usual. Trying a backup model...";
  return "Still working. This can take up to a minute when the AI is busy.";
}

type Busy = "generate" | "regenerate" | "download" | "downloadNotes" | "email" | null;

export function CvBuilder() {
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [skipped, setSkipped] = useState<Set<number>>(() => new Set());
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cv, setCv] = useState<FinalCv | null>(null);
  const [version, setVersion] = useState(0); // bumps on each generation so the preview re-animates
  const [busy, setBusy] = useState<Busy>(null);
  const [elapsed, setElapsed] = useState(0); // seconds the current AI generation has been running
  const generating = busy === "generate" || busy === "regenerate";

  useEffect(() => {
    if (!generating) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [generating]);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Once the user has tried to continue, errors update live as they type and clear when fixed.
  const errors: FieldErrors = showErrors ? validateStep(step, form) : {};
  const err = (key: string) => errors[key];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function updateItem<K extends ListKey>(key: K, index: number, patch: Partial<FormState[K][number]>) {
    setForm((f) => ({ ...f, [key]: f[key].map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  }

  function removeItem(key: ListKey, index: number) {
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));
  }

  const statuses = STEPS.map((_, i) => stepStatus(i, step, form, visited, skipped));

  /** Moves to a step. Never touches form data, so nothing entered is lost. */
  function goTo(target: number) {
    setDirection(target > step ? 1 : -1);
    setStep(target);
    setVisited((v) => new Set(v).add(target));
    setShowErrors(false);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectStep(i: number) {
    if (statuses[i] !== "current" && statuses[i] !== "locked") goTo(i);
  }

  /** Where Next/Skip lead: the following step, unless it's a required step that isn't unlocked yet. */
  function forwardTarget(skippedNow: Set<number>) {
    const target = step + 1;
    if (STEPS[target].optional) return target;
    const seen = new Set(visited).add(step);
    if (stepStatus(target, step, form, seen, skippedNow) !== "locked") return target;
    return requiredFrontier(form, seen);
  }

  /** Validates the current step; on failure shows inline errors and focuses the first invalid field. */
  function checkStep() {
    const ok = Object.keys(validateStep(step, form)).length === 0;
    if (!ok) {
      setShowErrors(true);
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-error]');
        first?.scrollIntoView({ block: "center", behavior: "smooth" });
        first?.focus({ preventScroll: true });
      });
    }
    return ok;
  }

  function next() {
    if (!checkStep()) return;
    const nextSkipped = new Set(skipped);
    // An optional step left empty is treated as skipped (and omitted from the CV).
    if (STEPS[step].optional && !hasData(step, form)) nextSkipped.add(step);
    else nextSkipped.delete(step);
    setSkipped(nextSkipped);
    goTo(forwardTarget(nextSkipped));
  }

  function skip() {
    const clears = SKIP_CLEARS[step];
    if (!clears) return;
    const nextSkipped = new Set(skipped).add(step);
    setForm((f) => ({ ...f, ...clears }));
    setSkipped(nextSkipped);
    goTo(forwardTarget(nextSkipped));
  }

  /** Previous step, skipping any locked required steps (only possible after jumping ahead to an optional step). */
  function back() {
    let target = step - 1;
    while (target > 0 && statuses[target] === "locked") target--;
    goTo(Math.max(0, target));
  }

  function edit() {
    setCv(null);
    setNotice(null);
    setDirection(-1);
    setStep(0);
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function requestCv(): Promise<FinalCv> {
    const payload = cvFormSchema.safeParse(toPayload(form));
    if (!payload.success) throw new Error(formatIssues(payload.error).join(" "));
    // Hard stop so the user is never left waiting indefinitely (the server gives up at ~55s).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new Error("The AI is taking too long right now. Please try again in a minute.");
      throw new Error("Could not reach the server. Check your connection and try again.");
    } finally {
      clearTimeout(timer);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.cv) {
      throw new Error([data?.error, ...(data?.details ?? [])].filter(Boolean).join(" ") || "Something went wrong. Please try again.");
    }
    return data.cv;
  }

  async function generate() {
    if (!checkStep()) return;
    const firstInvalid = STEPS.findIndex((_, i) => !isValid(i, form));
    if (firstInvalid !== -1) {
      goTo(firstInvalid);
      setShowErrors(true);
      setSubmitError("Please finish this step before generating your CV.");
      return;
    }
    setBusy("generate");
    setSubmitError(null);
    try {
      setCv(await requestCv());
      setVersion((v) => v + 1);
      setNotice(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    setBusy("regenerate");
    setNotice(null);
    try {
      setCv(await requestCv());
      setVersion((v) => v + 1);
      setNotice({ kind: "success", text: "Regenerated with the same details. Review the new version below." });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Could not regenerate. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  /** Adds a recommended skill the user has confirmed they have to the CV's technical skills. */
  function addSkill(skill: string) {
    setCv((current) => {
      if (!current) return current;
      const groups = current.technicalSkills.map((g) => ({ ...g, skills: [...g.skills] }));
      const extra = groups.find((g) => g.category === "Additional Skills");
      if (extra) extra.skills.push(skill);
      else groups.push({ category: "Additional Skills", skills: [skill] });
      return {
        ...current,
        technicalSkills: groups,
        recommendedSkills: current.recommendedSkills.filter((r) => r.skill !== skill),
        // The user confirmed this skill, so it now counts as matched rather than missing.
        ats: {
          ...current.ats,
          matched: current.ats.matched.some((k) => k.toLowerCase() === skill.toLowerCase()) ? current.ats.matched : [...current.ats.matched, skill],
          missing: current.ats.missing.filter((k) => k.toLowerCase() !== skill.toLowerCase()),
        },
      };
    });
    setNotice({ kind: "success", text: `Added "${skill}" to your Skills.` });
  }

  async function download(includeNotes = false) {
    if (!cv) return;
    setBusy(includeNotes ? "downloadNotes" : "download");
    setNotice(null);
    try {
      const res = await fetch("/api/download-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, includeNotes }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Download failed.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFilename(cv.contact.fullName).replace(/\.pdf$/, includeNotes ? "_with_notes.pdf" : ".pdf");
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ kind: "success", text: includeNotes ? "Downloaded your CV with the notes page. Remove the last page before sending it to employers." : "Your CV has been downloaded." });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Download failed." });
    } finally {
      setBusy(null);
    }
  }

  async function email() {
    if (!cv) return;
    setBusy("email");
    setNotice(null);
    try {
      const res = await fetch("/api/send-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Email failed.");
      setNotice({ kind: "success", text: `Sent! Check ${data.sentTo} for your CV.` });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Email failed." });
    } finally {
      setBusy(null);
    }
  }

  // ---------- Review screen ----------

  if (cv) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div>
              <span className="pill">
                <CheckIcon className="h-3 w-3" />
                Ready
              </span>
              <h2 className="mt-3 font-serif text-3xl tracking-tight">Your CV is ready</h2>
              <p className="mt-1 text-sm text-muted">Review it below, then download it or send it to {cv.contact.email}.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-line pt-5 sm:flex sm:flex-wrap sm:items-center">
              <button type="button" onClick={edit} className="btn-secondary" disabled={busy !== null}>
                Edit
              </button>
              <button type="button" onClick={regenerate} className="btn-secondary" disabled={busy !== null}>
                {busy === "regenerate" ? <><Spinner /> Regenerating... {elapsed}s</> : "Regenerate"}
              </button>
              <button type="button" onClick={email} className="btn-secondary" disabled={busy !== null}>
                {busy === "email" ? <><Spinner /> Sending...</> : "Send to Email"}
              </button>
              <button type="button" onClick={() => download(true)} className="btn-secondary sm:ml-auto" disabled={busy !== null} title="Adds a final page with your ATS keyword summary and suggestions">
                {busy === "downloadNotes" ? <><Spinner /> Preparing...</> : "Download CV + notes"}
              </button>
              <button type="button" onClick={() => download()} className="btn-primary" disabled={busy !== null}>
                {busy === "download" ? <><Spinner /> Preparing...</> : "Download CV"}
              </button>
            </div>
          </div>
        </div>
        {cv.experience.some((e) => e.aiSuggested) ? (
          <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200" role="note">
            <span aria-hidden>⚠</span>
            <p>
              Some bullet points were <strong>suggested by AI</strong> because you left them empty. They describe typical duties
              for the role, not your actual work. Check they&apos;re accurate. If not, click <strong>Edit</strong> and write your own.
            </p>
          </div>
        ) : null}
        <AnimatePresence>
          {notice ? (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                notice.kind === "success"
                  ? "border-line bg-surface text-foreground"
                  : "border-red-300 text-red-700 dark:border-red-900 dark:text-red-400",
              )}
            >
              {notice.text}
            </motion.p>
          ) : null}
        </AnimatePresence>
        <motion.div
          key={version}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: busy === "regenerate" ? 0.45 : 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <CvPreview cv={cv} />
          <div className="mt-6">
            <CvNotes cv={cv} onAddSkill={addSkill} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- Form screen ----------

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="border-b border-line p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="pill">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className={cn("pill", !STEPS[step].optional && "border-foreground/20 text-foreground")}>
              {STEPS[step].optional ? "Optional" : "Required"}
            </span>
          </div>
          <span className="text-xs font-medium tabular-nums text-muted">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <Stepper statuses={statuses} onSelect={selectStep} />
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={step} custom={direction} variants={slide} initial="enter" animate="center" exit="exit" transition={slideTransition}>
            <h2 className="mt-7 font-serif text-3xl tracking-tight sm:text-4xl">{STEPS[step].title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{STEPS[step].hint}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
          className="space-y-4 p-5 sm:p-8"
        >
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full name" value={form.personal.fullName} autoComplete="name" error={err("personal.fullName")} onChange={(e) => update("personal", { ...form.personal, fullName: e.target.value })} />
              <TextField label="Email" type="email" value={form.personal.email} autoComplete="email" error={err("personal.email")} onChange={(e) => update("personal", { ...form.personal, email: e.target.value })} />
              <TextField label="Phone" type="tel" value={form.personal.phone} autoComplete="tel" error={err("personal.phone")} onChange={(e) => update("personal", { ...form.personal, phone: e.target.value })} />
              <TextField label="Location" placeholder="e.g. Lagos, Nigeria" value={form.personal.location} error={err("personal.location")} onChange={(e) => update("personal", { ...form.personal, location: e.target.value })} />
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
                <TextField label="LinkedIn URL" optional placeholder="linkedin.com/in/yourname" value={form.personal.linkedin} error={err("personal.linkedin")} onChange={(e) => update("personal", { ...form.personal, linkedin: e.target.value })} />
                <TextField label="Portfolio / website" optional placeholder="yourname.com" value={form.personal.portfolio} error={err("personal.portfolio")} onChange={(e) => update("personal", { ...form.personal, portfolio: e.target.value })} />
                <TextField label="GitHub" optional placeholder="github.com/yourname" value={form.personal.github} error={err("personal.github")} onChange={(e) => update("personal", { ...form.personal, github: e.target.value })} />
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              <TextField label="Job title" placeholder="e.g. Registered Nurse, Accountant, Electrician" value={form.professional.jobTitle} error={err("professional.jobTitle")} onChange={(e) => update("professional", { ...form.professional, jobTitle: e.target.value })} />
              <TextArea label="Professional summary" optional rows={5} placeholder="Leave blank and AI will generate one using only what you provide." value={form.professional.summary} error={err("professional.summary")} onChange={(e) => update("professional", { ...form.professional, summary: e.target.value })} />
            </>
          )}

          {step === 2 && (
            <>
              {form.experience.map((w, i) => {
                const bulletsError = err(`experience.${i}.bullets`);
                return (
                  <Card key={i} title={`Position ${i + 1}`} onRemove={() => removeItem("experience", i)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField label="Company" value={w.company} error={err(`experience.${i}.company`)} onChange={(e) => updateItem("experience", i, { company: e.target.value })} />
                      <TextField label="Role" value={w.role} error={err(`experience.${i}.role`)} onChange={(e) => updateItem("experience", i, { role: e.target.value })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <TextField label="Location" optional placeholder="e.g. Lagos" value={w.location} error={err(`experience.${i}.location`)} onChange={(e) => updateItem("experience", i, { location: e.target.value })} />
                      <TextField label="Start date" type="month" value={w.startDate} error={err(`experience.${i}.startDate`)} onChange={(e) => updateItem("experience", i, { startDate: e.target.value })} />
                      <TextField label="End date" type="month" value={w.current ? "" : w.endDate} disabled={w.current} error={w.current ? undefined : err(`experience.${i}.endDate`)} onChange={(e) => updateItem("experience", i, { endDate: e.target.value })} />
                    </div>
                    <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground">
                      <input type="checkbox" className="h-4 w-4 cursor-pointer rounded border-line accent-foreground" checked={w.current} onChange={(e) => updateItem("experience", i, { current: e.target.checked })} />
                      I still work here
                    </label>
                    <div className="space-y-2 pt-1">
                      <span className="text-sm font-medium">Responsibilities <span className="font-normal text-muted">(optional, up to 5)</span></span>
                      <p className="text-xs text-muted">Leave these empty and AI will suggest a few general bullet points for you to review.</p>
                      {w.bullets.map((b, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <span className="w-4 shrink-0 text-center text-muted" aria-hidden>•</span>
                          <input
                            className={controlClass}
                            aria-label={`Bullet point ${j + 1}`}
                            aria-invalid={bulletsError && !b.trim() ? true : undefined}
                            placeholder={`Bullet point ${j + 1}`}
                            value={b}
                            onChange={(e) => updateItem("experience", i, { bullets: w.bullets.map((x, k) => (k === j ? e.target.value : x)) })}
                          />
                          {w.bullets.length > 1 ? (
                            <button type="button" aria-label={`Remove bullet point ${j + 1}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-muted transition hover:bg-subtle hover:text-foreground active:scale-90" onClick={() => updateItem("experience", i, { bullets: w.bullets.filter((_, k) => k !== j) })}>
                              ×
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <div className="pl-6">
                        <FieldError message={bulletsError} />
                      </div>
                      {w.bullets.length < 5 ? (
                        <button type="button" className="ml-4 rounded-full px-2 py-1 text-sm font-medium text-muted transition hover:bg-subtle hover:text-foreground active:scale-95" onClick={() => updateItem("experience", i, { bullets: [...w.bullets, ""] })}>
                          + Add bullet point
                        </button>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
              {err("experience") ? <div data-error tabIndex={-1} className="outline-none"><FieldError message={err("experience")} /></div> : null}
              {form.experience.length < 10 ? <AddButton onClick={() => update("experience", [...form.experience, emptyWork()])}>Add position</AddButton> : null}
            </>
          )}

          {step === 3 && (
            <>
              {form.education.map((ed, i) => (
                <Card key={i} title={`Education ${i + 1}`} onRemove={() => removeItem("education", i)}>
                  <TextField label="Institution" value={ed.institution} error={err(`education.${i}.institution`)} onChange={(e) => updateItem("education", i, { institution: e.target.value })} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextField label="Degree" placeholder="e.g. BSc, HND, OND, NCE" value={ed.degree} error={err(`education.${i}.degree`)} onChange={(e) => updateItem("education", i, { degree: e.target.value })} />
                    <TextField label="Field of study" value={ed.field} error={err(`education.${i}.field`)} onChange={(e) => updateItem("education", i, { field: e.target.value })} />
                    <TextField label="Graduation year" inputMode="numeric" maxLength={4} placeholder="2024" value={ed.year} error={err(`education.${i}.year`)} onChange={(e) => updateItem("education", i, { year: e.target.value })} />
                  </div>
                </Card>
              ))}
              {err("education") ? <div data-error tabIndex={-1} className="outline-none"><FieldError message={err("education")} /></div> : null}
              {form.education.length < 10 ? <AddButton onClick={() => update("education", [...form.education, emptyEducation()])}>Add education</AddButton> : null}
            </>
          )}

          {step === 4 && (
            <TextArea label="Skills" rows={4} placeholder="e.g. Patient care, Customer service, Microsoft Excel, Bookkeeping, Electrical wiring" value={form.skillsText} error={err("skills")} onChange={(e) => update("skillsText", e.target.value)} />
          )}

          {step === 5 && (
            <>
              {form.certifications.length === 0 ? <p className="text-sm text-muted">No certifications added. Add one below, or click Skip to leave this section off your CV.</p> : null}
              {form.certifications.map((c, i) => (
                <Card key={i} title={`Certification ${i + 1}`} onRemove={() => removeItem("certifications", i)}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <TextField label="Name" value={c.name} error={err(`certifications.${i}.name`)} onChange={(e) => updateItem("certifications", i, { name: e.target.value })} />
                    <TextField label="Issuer" value={c.issuer} error={err(`certifications.${i}.issuer`)} onChange={(e) => updateItem("certifications", i, { issuer: e.target.value })} />
                    <TextField label="Year" optional inputMode="numeric" maxLength={4} value={c.year} error={err(`certifications.${i}.year`)} onChange={(e) => updateItem("certifications", i, { year: e.target.value })} />
                  </div>
                </Card>
              ))}
              {form.certifications.length < 20 ? <AddButton onClick={() => update("certifications", [...form.certifications, emptyCertification()])}>Add certification</AddButton> : null}
            </>
          )}

          {step === 6 && (
            <>
              {form.projects.length === 0 ? <p className="text-sm text-muted">No projects added. Add one below, or click Skip to leave this section off your CV.</p> : null}
              {form.projects.map((p, i) => (
                <Card key={i} title={`Project ${i + 1}`} onRemove={() => removeItem("projects", i)}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField label="Name" value={p.name} error={err(`projects.${i}.name`)} onChange={(e) => updateItem("projects", i, { name: e.target.value })} />
                    <TextField label="URL" optional value={p.url} error={err(`projects.${i}.url`)} onChange={(e) => updateItem("projects", i, { url: e.target.value })} />
                  </div>
                  <TextArea label="Description" rows={3} value={p.description} error={err(`projects.${i}.description`)} onChange={(e) => updateItem("projects", i, { description: e.target.value })} />
                </Card>
              ))}
              {form.projects.length < 10 ? <AddButton onClick={() => update("projects", [...form.projects, emptyProject()])}>Add project</AddButton> : null}
            </>
          )}

          {step === 7 && (
            <>
              <TextField label="Target job title" placeholder="e.g. Senior Nurse, Sales Manager, Site Engineer" value={form.targetJobTitle} error={err("targetJobTitle")} onChange={(e) => update("targetJobTitle", e.target.value)} />
              <TextArea
                label="Target job description"
                optional
                rows={9}
                placeholder="Paste the full job advert here. The AI will match your real experience to it, use the right keywords, and show which requirements you already cover."
                value={form.jobDescription}
                error={err("jobDescription")}
                onChange={(e) => update("jobDescription", e.target.value)}
              />
              <p className="-mt-2 text-right text-xs text-muted tabular-nums">{form.jobDescription.length.toLocaleString()} / 8,000</p>
            </>
          )}

          {busy === "generate" ? (
            <p className="flex items-center gap-2 rounded-xl border border-line bg-background px-4 py-3 text-sm text-muted" role="status" aria-live="polite">
              <Spinner /> {generationStatus(elapsed)}
            </p>
          ) : null}
          {submitError ? (
            <p className="rounded-xl border border-red-300 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className={cn("flex items-center border-t border-line p-5 sm:px-8", isFirst ? "justify-end" : "justify-between")}>
        {!isFirst ? (
          <button type="button" onClick={back} className="btn-secondary" disabled={busy !== null}>
            <span aria-hidden>←</span> Back
          </button>
        ) : null}
        <div className="flex items-center gap-2">
        {STEPS[step].optional ? (
          <button type="button" onClick={skip} className="btn-secondary border-transparent" title="Clear this step and leave the section off your CV">
            Skip
          </button>
        ) : null}
        {isLast ? (
          <button type="button" onClick={generate} className="btn-primary" disabled={busy !== null}>
            {busy === "generate" ? <><Spinner /> Generating... {elapsed}s</> : "Generate My CV"}
          </button>
        ) : (
          <button type="button" onClick={next} className="btn-primary">
            Next <span aria-hidden>→</span>
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
