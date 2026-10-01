"use client";

import { motion } from "framer-motion";

// Set NEXT_PUBLIC_WHATSAPP_NUMBER (international format, digits only, e.g. 2348012345678)
// to open a WhatsApp chat. Without it, the button points to the "How it works" section.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
const HELP_MESSAGE = "Hi DAYTOZN, I need help with the CV builder.";

export function HelpButton() {
  const href = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(HELP_MESSAGE)}`
    : "/#how-it-works";

  return (
    <motion.a
      href={href}
      {...(WHATSAPP_NUMBER ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="reveal-failsafe-late fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 py-2.5 pr-4 pl-3 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:border-line-strong sm:right-6 sm:bottom-6"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      Need help?
    </motion.a>
  );
}
