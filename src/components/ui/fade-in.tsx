"use client";
import React from "react";
import { motion } from "framer-motion";

/** Fades and rises content into place the first time it scrolls into view. */
export const FadeIn = ({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) => {
  const Component = motion[as];
  return (
    <Component
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </Component>
  );
};

const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

/** Reveals its <StaggerItem> children one after another, on scroll into view or (onLoad) immediately. */
export const Stagger = ({
  children,
  className,
  gap = 0.2,
  onLoad = false,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
  onLoad?: boolean;
}) => (
  <motion.div
    initial="hidden"
    {...(onLoad ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount: 0.2 } })}
    variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div variants={staggerItem} className={className}>
    {children}
  </motion.div>
);
