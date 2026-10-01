import Link from "next/link";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Counter } from "@/components/ui/counter";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/fade-in";
import { FlipWords } from "@/components/ui/flip-words";
import { LiftCard } from "@/components/ui/lift-card";

const ROLES = [
  "Nurses",
  "Teachers",
  "Accountants",
  "Software Engineers",
  "Sales Executives",
  "Electricians",
  "Bankers",
  "Chefs",
  "Data Analysts",
  "Pharmacists",
  "Civil Engineers",
  "Customer Service Reps",
];

const STEPS = [
  {
    title: "Fill in your info",
    body: "Add your experience, education, skills and the role you want. Plain language is fine.",
  },
  {
    title: "AI improves it",
    body: "Your bullet points are rewritten into clear, action-led statements tailored to your target role.",
  },
  {
    title: "Download your CV",
    body: "Preview the result, then download a clean PDF or have it sent straight to your inbox.",
  },
];

// Only facts about the product itself; no usage numbers, since nothing is tracked.
const STATS: { value?: number; suffix?: string; text?: string; label: string }[] = [
  { value: 100, suffix: "%", label: "Free, with no sign-up" },
  { value: 8, label: "Steps to a finished CV" },
  { text: "ATS", label: "Friendly, single-column PDF" },
];

const FEATURES = [
  "Bullet points rewritten with strong action verbs",
  "A professional summary written from your own details",
  "Wording tailored to the job you're applying for",
  "Clean, single-column PDF that passes ATS scans",
  "Your CV emailed to you as a PDF attachment",
  "No account, no payment, nothing stored",
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <BackgroundBeams />
        <div className="hero-breathe pointer-events-none absolute top-1/2 left-1/2 h-[42rem] w-[min(60rem,140vw)] rounded-full" aria-hidden />
        <Stagger onLoad gap={0.2} className="relative mx-auto max-w-4xl px-4 pt-20 pb-28 text-center sm:px-6 sm:pt-28 sm:pb-36">
          <StaggerItem>
            <span className="pill">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden />
              DAYTOZN AI CV Builder · Free
            </span>
            <h1 className="mt-7 font-serif text-[2.75rem] leading-[1.05] tracking-tight text-foreground sm:text-7xl md:text-[5.25rem]">
              Build your CV for
              <span className="block min-h-[1.15em] text-[2.4rem] italic sm:text-7xl md:text-[5.25rem]">
                <FlipWords words={ROLES} />
              </span>
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Turn your real experience into a sharp, ATS-ready CV in minutes, polished by AI and never padded.
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/build" className="btn-primary px-7 py-3 text-[15px]">
                Build My CV
                <span aria-hidden>→</span>
              </Link>
              <a href="#how-it-works" className="btn-secondary px-7 py-3 text-[15px]">
                How it works
              </a>
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <FadeIn className="max-w-2xl">
            <span className="pill">How it works</span>
            <h2 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Three steps to a stronger CV.
            </h2>
          </FadeIn>
          <Stagger className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5" gap={0.15}>
            {STEPS.map((step, i) => (
              <StaggerItem key={step.title}>
                <LiftCard hover="scale" className="h-full p-7 sm:p-8">
                  <span className="font-serif text-5xl text-muted/60">0{i + 1}</span>
                  <h3 className="mt-8 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </LiftCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-line">
        <dl className="mx-auto grid max-w-6xl divide-y divide-line px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1} className="flex flex-col items-start gap-2 py-10 sm:px-8 sm:py-14 sm:first:pl-0">
              <dt className="order-2 text-sm text-muted">{stat.label}</dt>
              <dd className="order-1 font-serif text-6xl leading-none tracking-tight sm:text-7xl">
                {stat.value !== undefined ? <Counter value={stat.value} suffix={stat.suffix} /> : stat.text}
              </dd>
            </FadeIn>
          ))}
        </dl>
      </section>

      {/* Features */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 md:grid-cols-[1fr_1.2fr] md:gap-20">
          <FadeIn>
            <span className="pill">Free plan</span>
            <h2 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Everything you need to apply with confidence.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-muted">
              The AI only works with what you give it. It never adds jobs, skills or results you didn&apos;t provide,
              and your name, email and phone number are never sent to it.
            </p>
            <Link href="/build" className="btn-primary mt-8">
              Start building
              <span aria-hidden>→</span>
            </Link>
          </FadeIn>
          <ul className="divide-y divide-line border-y border-line">
            {FEATURES.map((feature, i) => (
              <FadeIn as="li" key={feature} delay={i * 0.05} className="flex items-start gap-4 py-5">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="text-[15px]">{feature}</span>
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
