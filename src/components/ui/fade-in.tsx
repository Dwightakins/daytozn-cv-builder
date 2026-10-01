"use client";
import React, { createContext, useContext } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

// SSR safety: Framer Motion writes each element's starting state (opacity: 0) into the server
// HTML, so if JavaScript is slow or fails (e.g. on a CDN), content stays invisible.
// - Scroll reveals render as plain, visible elements until hydration, then become motion
//   components (they're below the fold, so the switch is never seen).
// - Load-time ("eager") animations stay Framer-driven from the first paint, plus a CSS failsafe
//   (.reveal-failsafe) that forces them visible if Framer never runs.

const ease = [0.22, 1, 0.36, 1] as const;

/** Fades and rises content into place: on load (eager) or the first time it scrolls into view. */
export const FadeIn = ({
  children,
  className,
  delay = 0,
  as = "div",
  eager = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
  /** Animate on page load instead of on scroll; use for content visible without scrolling. */
  eager?: boolean;
}) => {
  const hydrated = useHydrated();
  const Component = motion[as];

  if (eager) {
    return (
      <Component
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay }}
        className={cn("reveal-failsafe", className)}
      >
        {children}
      </Component>
    );
  }

  if (!hydrated) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Component
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease, delay }}
      className={className}
    >
      {children}
    </Component>
  );
};

const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const StaggerContext = createContext({ eager: false });

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
}) => {
  const hydrated = useHydrated();
  const variants = { hidden: {}, show: { transition: { staggerChildren: gap } } };

  if (!onLoad && !hydrated) return <div className={className}>{children}</div>;
  return (
    <StaggerContext.Provider value={{ eager: onLoad }}>
      <motion.div
        initial="hidden"
        {...(onLoad ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount: 0.2 } })}
        variants={variants}
        className={className}
      >
        {children}
      </motion.div>
    </StaggerContext.Provider>
  );
};

export const StaggerItem = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const hydrated = useHydrated();
  const { eager } = useContext(StaggerContext);
  if (!eager && !hydrated) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={staggerItem} className={cn(eager && "reveal-failsafe", className)}>
      {children}
    </motion.div>
  );
};
