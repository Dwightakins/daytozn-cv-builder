"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Aceternity UI "Flip Words", toned down for an editorial feel: the outgoing word
// drifts up and blurs out (no scale-up), and the timer is cleaned up on unmount.
export const FlipWords = ({
  words,
  duration = 2600,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const [index, setIndex] = useState(0);
  const currentWord = words[index];

  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % words.length), duration);
    return () => clearTimeout(id);
  }, [index, duration, words.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={currentWord}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className={cn("relative inline-block whitespace-nowrap", className)}
      >
        {currentWord.split(" ").map((word, wordIndex) => (
          <motion.span
            key={word + wordIndex}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: wordIndex * 0.2, duration: 0.3 }}
            className="inline-block whitespace-nowrap"
          >
            {word.split("").map((letter, letterIndex) => (
              <motion.span
                key={word + letterIndex}
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: wordIndex * 0.2 + letterIndex * 0.035, duration: 0.2 }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
            {wordIndex < currentWord.split(" ").length - 1 ? <span className="inline-block">&nbsp;</span> : null}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
};
