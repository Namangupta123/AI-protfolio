"use client";

import { UIMessage, isTextUIPart } from "ai";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, AlertCircle, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageListProps {
  messages: UIMessage[];
  status: string;
  error: Error | undefined;
  regenerate: () => void;
  timestamps: Record<string, number>;
  setInput: Dispatch<SetStateAction<string>>;
}

export function MessageList({
  messages,
  status,
  error,
  regenerate,
  timestamps,
  setInput,
}: MessageListProps) {
  const isWaiting = status === "submitted";

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ScrollArea className="flex-1 px-3 sm:px-4 py-6 sm:py-8">
        <div
          className="flex flex-col gap-6 sm:gap-8 max-w-2xl mx-auto"
          aria-live="polite"
          aria-atomic="false"
        >
          <AnimatePresence>
            {messages.map((msg, i) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                timestamp={timestamps[msg.id]}
                addTopMargin={i > 0 && messages[i - 1].role !== msg.role}
                isLatestAssistantMessage={i === messages.length - 1 && msg.role === "assistant"}
                setInput={setInput}
              />
            ))}
            {isWaiting && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs max-w-2xl mx-auto w-full"
          >
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Something went wrong. Please try again after some time.
            </span>
            <button
              onClick={regenerate}
              className="flex items-center gap-1 hover:text-foreground transition-colors font-mono"
            >
              <RefreshCw className="w-3 h-3" />
              retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function useTypewriter(fullText: string, messageId: string, speedMs = 10) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [messageId]);

  useEffect(() => {
    if (index >= fullText.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), speedMs);
    return () => clearTimeout(t);
  }, [index, fullText.length, speedMs]);

  return { displayed: fullText.slice(0, index), isTyping: index < fullText.length };
}

function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(ts));
}

function extractSuggestions(content: string): string[] {
  const match = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1]) as { suggestions?: unknown };
    if (!parsed || typeof parsed !== "object") return [];
    if (!Array.isArray(parsed.suggestions)) return [];

    return parsed.suggestions
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function stripSuggestionBlock(content: string): string {
  return content.replace(/\n?```json\s*[\s\S]*?\s*```\s*$/i, "").trim();
}

function ChatBubble({
  message,
  timestamp,
  addTopMargin,
  isLatestAssistantMessage,
  setInput,
}: {
  message: UIMessage;
  timestamp?: number;
  addTopMargin?: boolean;
  isLatestAssistantMessage: boolean;
  setInput: Dispatch<SetStateAction<string>>;
}) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter(isTextUIPart);
  const fullText = textParts.map((p) => p.text).join("");
  const cleanText = isUser ? fullText : stripSuggestionBlock(fullText);
  const suggestions = isUser ? [] : extractSuggestions(fullText);
  const { displayed, isTyping } = useTypewriter(isUser ? "" : cleanText, message.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group flex items-end gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} ${addTopMargin ? "mt-2" : ""}`}
    >
      <div
        className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full border ${
          isUser
            ? "gradient-bg border-transparent text-white"
            : "bg-secondary border-border text-muted-foreground"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className="flex flex-col min-w-0">
        <div className={`flex items-end gap-2 ${isUser ? "flex-row" : ""}`}>
          {isUser && timestamp && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
              {formatTimestamp(timestamp)}
            </span>
          )}
          <div
            className={`max-w-[90%] sm:max-w-[80%] rounded-2xl text-sm leading-relaxed ${
              isUser ? "gradient-bg text-white px-4 py-3" : "text-foreground px-1 py-1"
            }`}
          >
            {isUser ? (
              fullText
            ) : isTyping ? (
              <span className="whitespace-pre-wrap">
                {displayed}
                <span className="inline-block w-px h-3.5 bg-violet-500 ml-0.5 animate-[blink_1s_step-end_infinite] align-middle" />
              </span>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                  pre: ({ children }) => (
                    <pre className="bg-background/60 rounded p-2 text-xs overflow-x-auto my-1.5 font-mono">
                      {children}
                    </pre>
                  ),
                  code: ({ children, className }) =>
                    className ? (
                      <code className="font-mono text-xs">{children}</code>
                    ) : (
                      <code className="bg-background/60 px-1 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>
                  ),
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-500 underline underline-offset-2 hover:text-violet-400"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {cleanText}
              </ReactMarkdown>
            )}
          </div>
        </div>

        {!isUser && isLatestAssistantMessage && suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 max-w-[90%] sm:max-w-[80%] px-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {!isUser && timestamp && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] text-muted-foreground text-right mt-1 whitespace-nowrap">
            {formatTimestamp(timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-3"
    >
      <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full border bg-secondary border-border text-muted-foreground">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-secondary border border-border rounded-2xl px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
