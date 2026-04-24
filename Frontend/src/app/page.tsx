"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, UIMessage, type TextUIPart } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Braces, Github, Linkedin, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageList } from "@/components/chat/MessageList";
import { BottomBar } from "@/components/chat/BottomBar";

const WELCOME: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Hey there! 👋 I'm Naman's AI assistant. Ask me anything about his skills, projects, or experience — I'll do my best to help you get to know him.",
      state: "done",
    } satisfies TextUIPart,
  ],
};

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
  const [input, setInput] = useState("");
  const [hasChat, setHasChat] = useState(false);

  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
    messages: [WELCOME],
  });

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status === "submitted" || status === "streaming") return;
    setHasChat(true);
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
        className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10"
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
          <ThemeToggle />
        </nav>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 flex flex-col pb-28 overflow-hidden">
        {/* Hero — empty state */}
        <AnimatePresence>
          {!hasChat && (
            <motion.section
              key="hero"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.25 } }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center flex-1 text-center px-6 gap-8"
            >
              <div className="space-y-3">
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight gradient-text">
                  Hello.
                </h1>
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  Ask anything about Naman.
                </h2>
              </div>

              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {SUGGESTION_CHIPS.map((chip, i) => (
                  <motion.button
                    key={chip}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}
                    onClick={() => submit(chip)}
                    className="px-4 py-2 rounded-full border border-border bg-transparent text-muted-foreground text-sm hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all duration-200"
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
    </div>
  );
}
