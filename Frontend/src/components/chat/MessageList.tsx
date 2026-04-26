"use client";

import { UIMessage, isTextUIPart } from "ai";
import { useEffect, useRef } from "react";
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
}

export function MessageList({ messages, status, error, regenerate, timestamps }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isWaiting = status === "submitted";
  const isStreaming = status === "streaming";

  const lastStreamingText = messages
    .at(-1)
    ?.parts.filter(isTextUIPart)
    .at(-1)?.text;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [lastStreamingText, isStreaming]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ScrollArea className="flex-1 px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl mx-auto" aria-live="polite" aria-atomic="false">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} timestamp={timestamps[msg.id]} />
            ))}
            {isWaiting && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </div>
        <div ref={bottomRef} />
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

function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(ts));
}

function ChatBubble({ message, timestamp }: { message: UIMessage; timestamp?: number }) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter(isTextUIPart);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`group flex items-end gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
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

      <div
        className={`max-w-[90%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "gradient-bg text-white rounded-br-sm"
            : "bg-secondary text-foreground rounded-bl-sm border border-border"
        }`}
      >
        {isUser ? (
          textParts.map((p) => p.text).join("")
        ) : (
          textParts.map((part, i) => (
            <span key={i}>
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
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
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
                {part.text}
              </ReactMarkdown>
              {part.state === "streaming" && (
                <span className="inline-block w-px h-3.5 bg-violet-500 ml-0.5 animate-[blink_1s_step-end_infinite] align-middle" />
              )}
            </span>
          ))
        )}
      </div>

      {timestamp && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] text-muted-foreground whitespace-nowrap self-end pb-0.5">
          {formatTimestamp(timestamp)}
        </span>
      )}
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
      <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl border border-border border-l-2 border-l-violet-500/40 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="h-3 rounded skeleton-shimmer" style={{ width: "70%" }} />
          <div className="h-3 rounded skeleton-shimmer" style={{ width: "45%" }} />
        </div>
      </div>
    </motion.div>
  );
}
