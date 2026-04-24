"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import ChatInterface, { type ChatInterfaceRef } from "@/components/chat/ChatInterface";
import { Braces, Github, Linkedin, Mail } from "lucide-react";

const SOCIAL_LINKS = [
  { icon: Github, label: "GitHub", href: "https://github.com/Namangupta123" },
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/naman-gupta-cse" },
  { icon: Mail, label: "Email", href: "mailto:namanguptacse0330@gmail.com" },
];

const SUGGESTION_CHIPS = [
  "What are Naman's top skills?",
  "Tell me about his projects",
  "What's his work experience?",
  "Is he open to opportunities?",
];

export default function Home() {
  const chatRef = useRef<ChatInterfaceRef>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  function handleChipClick(text: string) {
    chatSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    chatRef.current?.send(text);
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-6 py-4 border-b border-border"
      >
        <div className="flex items-center gap-2 text-primary font-mono text-sm font-medium">
          <Braces className="w-4 h-4" />
          <span>naman.dev</span>
        </div>
        <nav className="flex items-center gap-3">
          {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </nav>
      </motion.header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-10 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-mono"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Available for opportunities
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight"
        >
          Hi, I&apos;m{" "}
          <span className="text-primary">Naman Gupta</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-muted-foreground max-w-lg text-base sm:text-lg leading-relaxed"
        >
          Full-Stack AI Engineer. I build intelligent, production-ready
          applications with LLMs, RAG pipelines, and modern web tech.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-xs text-muted-foreground/60 font-mono"
        >
          ↓ Ask my AI assistant anything about me
        </motion.p>
      </section>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="flex flex-wrap justify-center gap-2 px-6 pb-6"
      >
        {SUGGESTION_CHIPS.map((chip) => (
          <SuggestionChip key={chip} text={chip} onClick={handleChipClick} />
        ))}
      </motion.div>

      {/* Chat */}
      <motion.div
        ref={chatSectionRef}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.65 }}
        className="flex-1 flex flex-col items-center px-4 pb-8"
      >
        <ChatInterface ref={chatRef} />
      </motion.div>
    </main>
  );
}

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-muted-foreground text-xs hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200 font-mono"
    >
      {text}
    </button>
  );
}
