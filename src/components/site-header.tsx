"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const SHRINK_AFTER = 50; // px scrolled before the navbar compacts

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SHRINK_AFTER);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300",
        scrolled ? "border-line bg-background/85" : "border-transparent bg-background/0",
      )}
    >
      <motion.div
        initial={false}
        animate={{ height: scrolled ? 60 : 84 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-[15px] font-bold tracking-[0.18em] text-foreground">DAYTOZN</span>
          <span className="pill hidden sm:inline-flex">CV Builder</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/build" className="hidden text-sm font-medium text-muted transition-colors hover:text-foreground sm:inline">
            Build my CV
          </Link>
          <ThemeToggle />
        </div>
      </motion.div>
    </header>
  );
}
