"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

export function BookACallButton() {
  return (
    <motion.a
      href="https://cal.com/naman-gupta/quick-chat"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.8 }}
      whileHover={{ scale: 1.05, transition: { type: "spring", stiffness: 350, damping: 20 } }}
      whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
      className="fixed bottom-8 right-6 z-50 flex items-center gap-2.5 gradient-bg text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg hover:shadow-violet-500/40 transition-shadow duration-300"
    >
      <CalendarDays className="w-4 h-4 shrink-0" />
      Book a Call
    </motion.a>
  );
}
