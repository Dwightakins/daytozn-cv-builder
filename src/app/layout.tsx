import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { HelpButton } from "@/components/help-button";
import { SiteFooter } from "@/components/site-chrome";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "DAYTOZN AI CV Builder",
  description: "Build a clean, ATS-friendly CV with AI that polishes your wording without inventing anything.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <HelpButton />
        </Providers>
      </body>
    </html>
  );
}
