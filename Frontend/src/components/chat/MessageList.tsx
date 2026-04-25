"use client";

import { UIMessage, isTextUIPart, type TextUIPart } from "ai";
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
}

export function MessageList({ messages, status, error, regenerate }: MessageListProps) {
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
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="flex flex-col gap-6 max-w-2xl mx-auto" aria-live="polite" aria-atomic="false">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
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

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter(isTextUIPart);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-end gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
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
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
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
                <span className="inline-block w-0.5 h-3.5 bg-violet-500 ml-0.5 animate-pulse align-middle" />
              )}
            </span>
          ))
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
      <div className="bg-secondary border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
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
