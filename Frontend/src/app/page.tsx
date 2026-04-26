"use client";

import { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, UIMessage, isTextUIPart } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Braces, CalendarDays, Github, Linkedin, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageList } from "@/components/chat/MessageList";
import { BottomBar } from "@/components/chat/BottomBar";
import { BookACallButton } from "@/components/BookACallButton";

// ── Session storage helpers ───────────────────────────────────────────────────

type StoredEntry = { role: "you" | "ai"; text: string; id: string; timestamp: number };

function getOrCreateChatId(): string {
  let id = sessionStorage.getItem("chatId");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("chatId", id);
  }
  return id;
}

function loadSession(): { messages: UIMessage[]; timestamps: Record<string, number> } {
  try {
    const raw = sessionStorage.getItem("chatMessages");
    if (!raw) return { messages: [], timestamps: {} };
    const entries: StoredEntry[] = JSON.parse(raw);
    const timestamps: Record<string, number> = {};
    const messages: UIMessage[] = entries.map((e) => {
      timestamps[e.id] = e.timestamp;
      return {
        id: e.id,
        role: e.role === "you" ? "user" : "assistant",
        content: e.text,
        parts: [{ type: "text" as const, text: e.text }],
      };
    });
    return { messages, timestamps };
  } catch {
    return { messages: [], timestamps: {} };
  }
}

function saveSession(msgs: UIMessage[], timestamps: Record<string, number>) {
  try {
    const entries: StoredEntry[] = msgs.map((m) => ({
      id: m.id,
      role: m.role === "user" ? "you" : "ai",
      text: m.parts.filter(isTextUIPart).map((p) => p.text).join(""),
      timestamp: timestamps[m.id] ?? Date.now(),
    }));
    sessionStorage.setItem("chatMessages", JSON.stringify(entries));
  } catch {
    // storage full or unavailable — fail silently
  }
}

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

  const [chatId] = useState<string>(() =>
    typeof window !== "undefined" ? getOrCreateChatId() : ""
  );

  const [timestamps, setTimestamps] = useState<Record<string, number>>({});

  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
    id: chatId,
  });

  // Restore messages and timestamps from session storage on mount
  useEffect(() => {
    const { messages: restored, timestamps: restoredTs } = loadSession();
    if (restored.length > 0) {
      setMessages(restored);
      setTimestamps(restoredTs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assign timestamps to new messages as they arrive
  useEffect(() => {
    setTimestamps((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const msg of messages) {
        if (!next[msg.id]) {
          next[msg.id] = Date.now();
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [messages]);

  // Persist after each completed exchange
  useEffect(() => {
    if (messages.length > 0 && status !== "streaming" && status !== "submitted") {
      saveSession(messages, timestamps);
    }
  }, [messages, status, timestamps]);

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
          <span>naman.app</span>
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
            className="[@media(min-width:980px)]:hidden text-muted-foreground hover:text-foreground transition-colors"
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
            timestamps={timestamps}
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
