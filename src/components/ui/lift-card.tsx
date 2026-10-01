"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const hoverEffects = {
  // Form entry cards: a small lift, no shadow (they hold inputs, so keep them steady).
  lift: { y: -4 },
  // Showcase cards: grow slightly and gain a soft shadow.
  scale: { scale: 1.03, boxShadow: "0 18px 40px -18px rgba(0, 0, 0, 0.22)" },
};

/** Bordered card with a subtle hover animation. */
export const LiftCard = ({
  children,
  className,
  hover = "lift",
}: {
  children: React.ReactNode;
  className?: string;
  hover?: keyof typeof hoverEffects;
}) => {
  return (
    <motion.div
      initial={hover === "scale" ? { boxShadow: "0 0 0 0 rgba(0, 0, 0, 0)" } : false}
      whileHover={hoverEffects[hover]}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("rounded-2xl border border-line bg-surface transition-colors duration-300 hover:border-line-strong", className)}
    >
      {children}
    </motion.div>
  );
};
