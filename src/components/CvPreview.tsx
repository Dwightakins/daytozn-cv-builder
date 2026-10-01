import type { ReactNode } from "react";
import type { FinalCv } from "@/lib/schemas";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-b border-neutral-900 pb-1 text-xs font-bold tracking-wider text-neutral-900 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const joinParts = (parts: string[]) => parts.filter(Boolean).join("  |  ");

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-5">
      {items.map((b, j) => (
        <li key={j}>{b}</li>
      ))}
    </ul>
  );
}

/** On-screen mirror of the PDF: single column, same sections, same order. */
export function CvPreview({ cv }: { cv: FinalCv }) {
  const { contact } = cv;

  return (
    <article className="mx-auto max-w-[210mm] rounded-sm border border-line bg-white px-6 py-8 text-[13px] leading-relaxed text-neutral-800 sm:px-12 sm:py-10">
      <h1 className="text-2xl font-bold text-neutral-900">{contact.fullName}</h1>
      <p className="mt-1 text-xs break-words text-neutral-600">
        {joinParts([contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio, contact.github])}
      </p>

      {cv.summary ? (
        <Section title="Professional Summary">
          <p>{cv.summary}</p>
        </Section>
      ) : null}

      {cv.coreCompetencies.length > 0 ? (
        <Section title="Core Competencies">
          <p>{cv.coreCompetencies.join("  |  ")}</p>
        </Section>
      ) : null}

      {cv.experience.length > 0 ? (
        <Section title="Professional Experience">
          <div className="space-y-4">
            {cv.experience.map((e, i) => (
              <div key={i}>
                <p className="font-semibold text-neutral-900">{e.role}</p>
                <p className="text-neutral-600">{joinParts([e.company, e.location, `${e.startDate} - ${e.endDate}`])}</p>
                {e.aiSuggested ? (
                  <div className="mt-2 rounded-md border border-dashed border-amber-400 bg-amber-50 px-3 py-2">
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
                      AI-suggested: check these are accurate
                    </p>
                    <Bullets items={e.bullets} />
                  </div>
                ) : (
                  <Bullets items={e.bullets} />
                )}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.projects.length > 0 ? (
        <Section title="Projects">
          <div className="space-y-3">
            {cv.projects.map((p, i) => (
              <div key={i}>
                <p className="font-semibold text-neutral-900">{p.name}</p>
                {p.url ? <p className="break-all text-neutral-600">{p.url}</p> : null}
                {p.description ? <p>{p.description}</p> : null}
                {p.bullets.length > 0 ? <Bullets items={p.bullets} /> : null}
                {p.technologies.length > 0 ? (
                  <p className="mt-1 text-neutral-600">
                    <span className="font-semibold text-neutral-800">Technologies:</span> {p.technologies.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.technicalSkills.length > 0 ? (
        <Section title="Skills">
          <div className="space-y-0.5">
            {cv.technicalSkills.map((g, i) => (
              <p key={i}>
                <span className="font-semibold text-neutral-900">{g.category}:</span> {g.skills.join(", ")}
              </p>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.education.length > 0 ? (
        <Section title="Education">
          <div className="space-y-3">
            {cv.education.map((e, i) => (
              <div key={i}>
                <p className="font-semibold text-neutral-900">
                  {e.degree}, {e.field}
                </p>
                <p className="text-neutral-600">{joinParts([e.institution, e.year])}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {cv.certifications.length > 0 ? (
        <Section title="Certifications & Recognition">
          <ul className="list-disc space-y-0.5 pl-5">
            {cv.certifications.map((c, i) => (
              <li key={i}>{[c.name, c.issuer, c.year].filter(Boolean).join(", ")}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}

function KeywordGroup({ label, hint, items, tone }: { label: string; hint: string; items: string[]; tone: "match" | "near" | "gap" }) {
  return (
    <div>
      <p className="text-sm font-medium">
        {label} <span className="font-normal text-muted">({items.length})</span>
      </p>
      <p className="text-xs text-muted">{hint}</p>
      {items.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((k) => (
            <li
              key={k}
              className={
                tone === "match"
                  ? "rounded-full bg-foreground px-2.5 py-0.5 text-xs text-background"
                  : tone === "near"
                    ? "rounded-full border border-line-strong px-2.5 py-0.5 text-xs"
                    : "rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs text-muted"
              }
            >
              {k}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">None identified.</p>
      )}
    </div>
  );
}

/** Feedback for the candidate (ATS keywords + suggestions). Never part of the CV itself. */
export function CvNotes({ cv, onAddSkill }: { cv: FinalCv; onAddSkill?: (skill: string) => void }) {
  const { ats, suggestions, targetRole, recommendedSkills } = cv;
  return (
    <section className="mx-auto max-w-[210mm] rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill">For you only</span>
        <span className="text-xs text-muted">Not part of your CV. Included only in &quot;Download CV + notes&quot;.</span>
      </div>
      <h3 className="mt-3 font-serif text-2xl tracking-tight">ATS keyword match</h3>
      <p className="mt-1 text-sm text-muted">
        How your CV lines up with {targetRole.title ? <strong className="text-foreground">{targetRole.title}</strong> : "the target role"}
        {targetRole.seniority ? ` (${targetRole.seniority})` : ""}.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <KeywordGroup label="Matched" hint="Clearly shown in your CV" items={ats.matched} tone="match" />
        <KeywordGroup label="Transferable" hint="Related experience you have" items={ats.transferable} tone="near" />
        <KeywordGroup label="Missing" hint="Add only if they're true for you" items={ats.missing} tone="gap" />
      </div>
      {recommendedSkills.length > 0 ? (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="font-serif text-2xl tracking-tight">Related skills you might have</h3>
          <p className="mt-1 text-sm text-muted">
            Skills this job values that relate to yours but aren&apos;t shown in your details. Add only the ones you genuinely have.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {recommendedSkills.map((r) => (
              <li key={r.skill}>
                <button
                  type="button"
                  onClick={() => onAddSkill?.(r.skill)}
                  title={r.reason}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-background px-3 py-1.5 text-sm transition hover:border-foreground hover:bg-subtle active:scale-95"
                >
                  <span aria-hidden className="text-muted">+</span> {r.skill}
                  <span className="sr-only">: add to my CV. {r.reason}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Hover a skill to see why it&apos;s relevant. Added skills appear under Skills.</p>
        </div>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="font-serif text-2xl tracking-tight">Suggested improvements</h3>
          <ul className="mt-3 space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line-strong text-[10px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
