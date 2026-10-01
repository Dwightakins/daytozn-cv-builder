import type { Metadata } from "next";
import { CvBuilder } from "@/components/CvBuilder";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "Build your CV · DAYTOZN AI CV Builder",
};

export default function BuildPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <FadeIn eager className="mb-10">
        <span className="pill">Free CV builder</span>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Build your CV</h1>
        <p className="mt-3 max-w-xl text-muted">
          Eight short steps. AI polishes your wording at the end, and you review everything before downloading.
        </p>
      </FadeIn>
      <FadeIn eager delay={0.1}>
        <CvBuilder />
      </FadeIn>
    </main>
  );
}
