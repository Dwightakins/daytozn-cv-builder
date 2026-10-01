import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { FinalCv } from "./schemas";

// Never hyphenate: split words ("manage-ment") and broken URLs look sloppy and can stop ATS
// software matching keywords. Lines wrap at spaces only.
Font.registerHyphenationCallback((word) => [word]);

// Built-in Helvetica: standard, embedded-free, and fully text-selectable for ATS parsing.
// Single column, standard headings, plain bullets; no tables, columns, icons or images.
const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#111111",
  },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 4 },
  contact: { fontSize: 9.5, color: "#333333" },
  section: { marginTop: 14 },
  heading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 0.75,
    borderBottomColor: "#111111",
    paddingBottom: 2,
    marginBottom: 6,
  },
  entry: { marginBottom: 8 },
  bold: { fontFamily: "Helvetica-Bold" },
  meta: { color: "#333333" },
  bulletRow: { flexDirection: "row", marginTop: 2, paddingLeft: 4 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
  skillLine: { marginBottom: 2 },
  // Notes page
  noteBanner: { borderWidth: 0.75, borderColor: "#999999", padding: 8, marginTop: 8, fontSize: 9.5, color: "#333333" },
  noteLabel: { fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 2 },
});

/** keepTogether: move short sections to the next page whole instead of splitting them. */
function Section({ title, children, keepTogether = false }: { title: string; children: ReactNode; keepTogether?: boolean }) {
  return (
    <View style={styles.section} wrap={!keepTogether}>
      {/* minPresenceAhead stops a heading being stranded alone at the bottom of a page. */}
      <Text style={styles.heading} minPresenceAhead={90}>{title}</Text>
      {children}
    </View>
  );
}

/** Section whose heading is glued to its first entry, so a heading is never stranded at a page bottom. */
function ListSection<T>({ title, items, renderItem }: { title: string; items: T[]; renderItem: (item: T, index: number) => ReactNode }) {
  const [first, ...rest] = items;
  return (
    <View style={styles.section}>
      <View wrap={false}>
        <Text style={styles.heading}>{title}</Text>
        {renderItem(first, 0)}
      </View>
      {rest.map((item, i) => renderItem(item, i + 1))}
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow} wrap={false}>
      <Text style={styles.bulletMark}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const joinParts = (parts: string[]) => parts.filter(Boolean).join(" | ");

function CvBody({ cv }: { cv: FinalCv }) {
  const { contact } = cv;
  return (
    <>
      {/* 1. Contact information */}
      <Text style={styles.name}>{contact.fullName}</Text>
      <Text style={styles.contact}>
        {joinParts([contact.email, contact.phone, contact.location, contact.linkedin, contact.portfolio, contact.github])}
      </Text>

      {/* 2. Professional summary */}
      {cv.summary ? (
        <Section title="Professional Summary" keepTogether>
          <Text>{cv.summary}</Text>
        </Section>
      ) : null}

      {/* 3. Core competencies */}
      {cv.coreCompetencies.length > 0 ? (
        <Section title="Core Competencies" keepTogether>
          <Text>{cv.coreCompetencies.join(" | ")}</Text>
        </Section>
      ) : null}

      {/* 4. Professional experience */}
      {cv.experience.length > 0 ? (
        <ListSection
          title="Professional Experience"
          items={cv.experience}
          renderItem={(e, i) => (
            <View key={i} style={styles.entry}>
              <Text style={styles.bold}>{e.role}</Text>
              <Text style={styles.meta}>{joinParts([e.company, e.location, `${e.startDate} - ${e.endDate}`])}</Text>
              {e.bullets.map((b, j) => (
                <Bullet key={j}>{b}</Bullet>
              ))}
            </View>
          )}
        />
      ) : null}

      {/* 5. Projects */}
      {cv.projects.length > 0 ? (
        <ListSection
          title="Projects"
          items={cv.projects}
          renderItem={(p, i) => (
            <View key={i} style={styles.entry} wrap={false}>
              <Text style={styles.bold}>{p.name}</Text>
              {p.url ? <Text style={styles.meta}>{p.url}</Text> : null}
              {p.description ? <Text>{p.description}</Text> : null}
              {p.bullets.map((b, j) => (
                <Bullet key={j}>{b}</Bullet>
              ))}
              {p.technologies.length > 0 ? (
                <Text style={styles.meta}>
                  <Text style={styles.bold}>Technologies: </Text>
                  {p.technologies.join(", ")}
                </Text>
              ) : null}
            </View>
          )}
        />
      ) : null}

      {/* 6. Skills, by category */}
      {cv.technicalSkills.length > 0 ? (
        <Section title="Skills" keepTogether>
          {cv.technicalSkills.map((group, i) => (
            <Text key={i} style={styles.skillLine}>
              <Text style={styles.bold}>{group.category}: </Text>
              {group.skills.join(", ")}
            </Text>
          ))}
        </Section>
      ) : null}

      {/* 7. Education */}
      {cv.education.length > 0 ? (
        <Section title="Education" keepTogether>
          {cv.education.map((e, i) => (
            <View key={i} style={styles.entry} wrap={false}>
              <Text style={styles.bold}>
                {e.degree}, {e.field}
              </Text>
              <Text style={styles.meta}>{joinParts([e.institution, e.year])}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {/* 8. Certifications & recognition */}
      {cv.certifications.length > 0 ? (
        <Section title="Certifications & Recognition" keepTogether>
          {cv.certifications.map((c, i) => (
            <Bullet key={i}>{[c.name, c.issuer, c.year].filter(Boolean).join(", ")}</Bullet>
          ))}
        </Section>
      ) : null}
    </>
  );
}

/** Separate final page for the candidate only: ATS keyword summary and suggested improvements. */
function NotesPage({ cv }: { cv: FinalCv }) {
  const { ats, suggestions, targetRole } = cv;
  const tailoredFor = [targetRole.title, targetRole.seniority && `(${targetRole.seniority})`].filter(Boolean).join(" ");
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.name}>Notes for you</Text>
      <View style={styles.noteBanner}>
        <Text>
          This page is not part of your CV. It is for you only. Remove it before sending your CV to employers, or use
          the &quot;Download CV&quot; option, which leaves it out.
        </Text>
      </View>
      {tailoredFor ? (
        <Text style={{ marginTop: 10 }}>
          <Text style={styles.bold}>Tailored for: </Text>
          {tailoredFor}
          {targetRole.industry ? `, ${targetRole.industry}` : ""}
        </Text>
      ) : null}

      <Section title="ATS Keyword Summary">
        <Text style={styles.noteLabel}>Matched keywords (clearly shown in your CV)</Text>
        <Text>{ats.matched.length > 0 ? ats.matched.join(", ") : "None identified."}</Text>
        <Text style={styles.noteLabel}>Transferable keywords (related experience)</Text>
        <Text>{ats.transferable.length > 0 ? ats.transferable.join(", ") : "None identified."}</Text>
        <Text style={styles.noteLabel}>Missing keywords (add only if they are true for you)</Text>
        <Text>{ats.missing.length > 0 ? ats.missing.join(", ") : "None identified."}</Text>
      </Section>

      {cv.recommendedSkills.length > 0 ? (
        <Section title="Related Skills To Consider">
          <Text style={{ marginBottom: 4 }}>Add these to your CV only if you genuinely have them.</Text>
          {cv.recommendedSkills.map((r, i) => (
            <Bullet key={i}>{r.reason ? `${r.skill}: ${r.reason}` : r.skill}</Bullet>
          ))}
        </Section>
      ) : null}

      {suggestions.length > 0 ? (
        <Section title="Suggested Improvements">
          {suggestions.map((s, i) => (
            <Bullet key={i}>{s}</Bullet>
          ))}
        </Section>
      ) : null}
    </Page>
  );
}

export function CvDocument({ cv, includeNotes = false }: { cv: FinalCv; includeNotes?: boolean }) {
  return (
    <Document title={`${cv.contact.fullName} - CV`} author={cv.contact.fullName} creator="DAYTOZN AI CV Builder">
      <Page size="A4" style={styles.page}>
        <CvBody cv={cv} />
      </Page>
      {includeNotes ? <NotesPage cv={cv} /> : null}
    </Document>
  );
}

export function renderCvPdf(cv: FinalCv, options: { includeNotes?: boolean } = {}): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} includeNotes={options.includeNotes} />);
}
