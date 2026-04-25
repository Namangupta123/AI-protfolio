"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Braces, CalendarDays, Github, Linkedin, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageList } from "@/components/chat/MessageList";
import { BottomBar } from "@/components/chat/BottomBar";
import { BookACallButton } from "@/components/BookACallButton";

const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL;
const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL;
const MAIL_URL = process.env.NEXT_PUBLIC_MAIL_URL;

const SOCIAL_LINKS = [
  { icon: Github, label: "GitHub", href: GITHUB_URL },
  { icon: Linkedin, label: "LinkedIn", href: LINKEDIN_URL },
  { icon: Mail, label: "Email", href: MAIL_URL },
];

const SUGGESTION_CHIPS = [
  "What are Naman's top skills?",
  "Tell me about his projects",
  "What's his work experience?",
  "Is he open to opportunities?",
];

export default function Home() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
  });

  const hasChat = messages.length > 0;

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status === "submitted" || status === "streaming") return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(input);
  }

  const isDisabled = status === "submitted" || status === "streaming";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10"
      >
        <div className="flex items-center gap-2 font-mono text-sm font-medium">
          <Braces className="w-4 h-4 text-violet-500" />
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
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
          <a
            href={process.env.NEXT_PUBLIC_CAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Book a Call"
            className="[@media(min-width:965px)]:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
          </a>
          <ThemeToggle />
        </nav>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 flex flex-col pb-32 sm:pb-28 overflow-hidden">
        {/* Hero — empty state */}
        <AnimatePresence>
          {!hasChat && (
            <motion.section
              key="hero"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.25 } }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center flex-1 text-center px-4 sm:px-6 gap-6 sm:gap-8"
            >
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight gradient-text">
                  Hello.
                </h1>
                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                  Ask anything about Naman.
                </h2>
              </div>

              <div className="flex flex-wrap justify-center gap-2 max-w-xs sm:max-w-xl">
                {SUGGESTION_CHIPS.map((chip, i) => (
                  <motion.button
                    key={chip}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
                    onClick={() => submit(chip)}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border bg-transparent text-muted-foreground text-xs sm:text-sm hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all duration-200"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Chat messages — chat state */}
        {hasChat && (
          <MessageList
            messages={messages}
            status={status}
            error={error}
            regenerate={regenerate}
          />
        )}
      </main>

      {/* Fixed bottom bar — always visible */}
      <BottomBar
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        disabled={isDisabled}
      />

      <BookACallButton />
    </div>
  );
}
