"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Aceternity UI "Background Beams", adapted:
// - beams use the site's ink colour (var(--foreground)) at low opacity instead of cyan/purple
// - Math.random() replaced with a fixed per-beam value so server and client render identically
// - the 50 hand-written paths are generated from the same base curve and offset

const BASE = [
  [-380, -189], [-380, -189], [-312, 216], [152, 343], [616, 470], [684, 875], [684, 875],
];
const beam = (i: number) => {
  const p = BASE.map(([x, y]) => [x + 7 * i, y - 8 * i]);
  return `M${p[0][0]} ${p[0][1]}C${p[1].join(" ")} ${p[2].join(" ")} ${p[3].join(" ")}C${p[4].join(" ")} ${p[5].join(" ")} ${p[6].join(" ")}`;
};

const PATHS = Array.from({ length: 50 }, (_, i) => beam(i));
const BACKDROP = Array.from({ length: 58 }, (_, i) => beam(i)).join("");

/** Deterministic 0..1 value per beam (stands in for Math.random()). */
const seeded = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const BackgroundBeams = React.memo(({ className }: { className?: string }) => {
  return (
    <div className={cn("pointer-events-none absolute inset-0 flex h-full w-full items-center justify-center", className)} aria-hidden>
      <svg
        className="pointer-events-none absolute z-0 h-full w-full"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={BACKDROP} stroke="url(#beams-backdrop)" strokeOpacity="0.06" strokeWidth="0.5" />

        {PATHS.map((path, index) => (
          <path key={index} d={path} stroke={`url(#beam-${index})`} strokeOpacity="0.35" strokeWidth="0.5" />
        ))}
        <defs>
          {PATHS.map((_, index) => (
            <motion.linearGradient
              id={`beam-${index}`}
              key={index}
              initial={{ x1: "0%", x2: "0%", y1: "0%", y2: "0%" }}
              animate={{
                x1: ["0%", "100%"],
                x2: ["0%", "95%"],
                y1: ["0%", "100%"],
                y2: ["0%", `${93 + seeded(index, 1) * 8}%`],
              }}
              transition={{
                duration: seeded(index, 2) * 10 + 14, // slow: 14-24s per sweep
                ease: "easeInOut",
                repeat: Infinity,
                delay: seeded(index, 3) * 10,
              }}
            >
              <stop style={{ stopColor: "var(--foreground)" }} stopOpacity="0" />
              <stop style={{ stopColor: "var(--foreground)" }} stopOpacity="0.9" />
              <stop offset="32.5%" style={{ stopColor: "var(--foreground)" }} stopOpacity="0.6" />
              <stop offset="100%" style={{ stopColor: "var(--foreground)" }} stopOpacity="0" />
            </motion.linearGradient>
          ))}

          <radialGradient
            id="beams-backdrop"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)"
          >
            <stop offset="0.0666667" style={{ stopColor: "var(--muted)" }} />
            <stop offset="0.243243" style={{ stopColor: "var(--muted)" }} />
            <stop offset="0.43594" style={{ stopColor: "var(--background)" }} stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
});

BackgroundBeams.displayName = "BackgroundBeams";
