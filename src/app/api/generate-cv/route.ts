import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildAiInput, mergeCv } from "@/lib/cv";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { aiCvSchema, cvFormSchema, formatIssues } from "@/lib/schemas";

export const maxDuration = 60;

// gemini-2.0-flash has been retired by Google. GEMINI_MODEL overrides the first choice; the
// others are tried in order when a model is busy, times out, or isn't available to this key.
// When Google is overloaded, all full "flash" models tend to be busy at once (and can take 15-25s
// just to say so), so chaining several only adds waiting. Best model first, then the fast lite model,
// which still produces a complete CV thanks to the completeness rules in the prompt.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-flash-lite-latest"];

// The SDK has no default timeout, so every call gets one. A full CV for a rich profile takes
// 15-25s to write, so the first (best) model gets the most time; we always keep a reserve so the
// fast lite model can still answer inside the total budget.
const FIRST_MODEL_TIMEOUT_MS = 35_000;
const OTHER_MODEL_TIMEOUT_MS = 20_000;
const LITE_RESERVE_MS = 10_000;
const TOTAL_BUDGET_MS = 55_000; // stay inside maxDuration

// Full payload/response logging: on in development, or anywhere with DEBUG_AI=1.
// The payload never contains the candidate's name, email or phone.
const DEBUG_AI = process.env.NODE_ENV === "development" || process.env.DEBUG_AI === "1";

const statusOf = (err: unknown) => (err as { status?: number }).status ?? 0;
const isTimeout = (err: unknown) => /abort|timeout|timed out/i.test(`${(err as Error).name} ${(err as Error).message}`);
const isBusy = (err: unknown) => [503, 429].includes(statusOf(err)) || isTimeout(err);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = cvFormSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid form data", details: formatIssues(parsed.error) }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing GEMINI_API_KEY" }, { status: 500 });
  }

  const form = parsed.data;
  const client = new GoogleGenerativeAI(apiKey);
  const aiInput = buildAiInput(form);
  const prompt = buildUserMessage(aiInput);
  if (DEBUG_AI) {
    console.log(
      `[AI] payload -> Gemini: ${aiInput.experience.length} jobs (${aiInput.experience.map((e) => e.bullets.length).join("/")} bullets), ` +
        `${aiInput.education.length} education, ${aiInput.skills.length} skills, ${aiInput.certifications.length} certifications, ` +
        `${aiInput.projects.length} projects, job description ${form.jobDescription.length} chars\n${JSON.stringify(aiInput, null, 2)}`,
    );
  }
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  let raw = "";
  let anyBusy = false;
  const models = [...new Set(MODELS)];
  for (const [index, name] of models.entries()) {
    const remaining = deadline - Date.now();
    const isLite = name.includes("lite");
    const cap = index === 0 ? FIRST_MODEL_TIMEOUT_MS : OTHER_MODEL_TIMEOUT_MS;
    const timeout = isLite ? remaining : Math.min(cap, remaining - LITE_RESERVE_MS);
    if (timeout < 4_000) {
      if (isLite || remaining < 4_000) break;
      continue; // not enough time for this model; jump ahead to the lite fallback
    }
    const started = Date.now();
    const model = client.getGenerativeModel(
      {
        model: name,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      },
      { timeout },
    );
    try {
      raw = (await model.generateContent(prompt)).response.text();
      if (name.includes("lite")) console.warn("[AI] Answered by the lite fallback model; output may be less detailed.");
      console.log(`Gemini answered (${name}) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
      break;
    } catch (err) {
      console.error(`Gemini request failed (${name}) after ${((Date.now() - started) / 1000).toFixed(1)}s:`, (err as Error).message.slice(0, 160));
      if (isBusy(err)) anyBusy = true;
      // Move on to the next model only if this one was busy, timed out, or isn't available.
      else if (statusOf(err) !== 404) break;
    }
  }
  if (!raw) {
    return Response.json(
      {
        error: anyBusy
          ? "The AI is very busy right now. Please try again in a minute."
          : "The AI service is unavailable. Please try again.",
      },
      { status: anyBusy ? 503 : 502 },
    );
  }

  if (DEBUG_AI) console.log(`[AI] raw response <- Gemini:\n${raw}`);

  let json: unknown;
  try {
    json = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return Response.json({ error: "The AI returned an invalid response. Please try again." }, { status: 502 });
  }

  const ai = aiCvSchema.safeParse(json);
  if (!ai.success) {
    console.error("AI output failed validation", ai.error.issues);
    return Response.json({ error: "The AI returned an unexpected format. Please try again." }, { status: 502 });
  }

  const report: string[] = [];
  const cv = mergeCv(form, ai.data, report);
  if (DEBUG_AI) {
    console.log(
      `[AI] merged CV: ${cv.experience.length} jobs (${cv.experience.map((e) => e.bullets.length).join("/")} bullets), ` +
        `${cv.projects.length} projects, ${cv.technicalSkills.reduce((n, g) => n + g.skills.length, 0)} skills, ` +
        `${cv.coreCompetencies.length} competencies, ${cv.certifications.length} certifications\n` +
        (report.length ? report.join("\n") : "(no safeguard removed anything)"),
    );
  }
  return Response.json({ cv });
}

/** Per-request instructions with explicit counts, so the model covers every entry the user gave. */
function buildUserMessage(input: ReturnType<typeof buildAiInput>) {
  const jobs = input.experience
    .map((e, i) => `  ${i + 1}. ${e.job_title} at ${e.company}: ${e.bullets.length} responsibilities provided`)
    .join("\n");
  return [
    "Write the complete CV for this candidate. Use EVERYTHING below; nothing may be skipped or merged away.",
    `- Experience: write ALL ${input.experience.length} positions, in this order:\n${jobs || "  (none)"}`,
    "  Every responsibility listed for a position must appear in that position's bullets (expanded professionally). Do not drop or merge any.",
    `- Projects: write ALL ${input.projects.length}. Certifications: ${input.certifications.length}. Education entries: ${input.education.length}. Skills listed: ${input.skills.length}.`,
    "- The professional summary must draw on the strongest evidence across ALL positions, education and certifications, tailored to the target role.",
    "",
    "CANDIDATE DATA (JSON):",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
