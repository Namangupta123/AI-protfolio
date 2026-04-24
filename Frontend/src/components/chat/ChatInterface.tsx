"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, UIMessage, isTextUIPart, type TextUIPart } from "ai";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export interface ChatInterfaceRef {
  send: (text: string) => void;
}

const ChatInterface = forwardRef<ChatInterfaceRef>(function ChatInterface(_, ref) {
  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
    messages: [WELCOME],
  });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    send(text: string) {
      sendMessage({ text });
    },
  }));
  const isWaiting = status === "submitted";
  const isStreaming = status === "streaming";

  // last streamed text — used to trigger mid-stream scroll
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isWaiting || isStreaming) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="w-full max-w-2xl flex flex-col rounded-2xl border border-border bg-card glow-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/30">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Naman&apos;s AI Assistant</p>
          <p className="text-xs text-muted-foreground">Powered by Groq · RAG</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Messages */}
      <ScrollArea className="h-[420px] px-4 py-4">
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isWaiting && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs"
          >
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Could not reach the AI backend. Is FastAPI running on port 8000?
            </span>
            <button
              onClick={() => regenerate()}
              className="flex items-center gap-1 hover:text-foreground transition-colors font-mono"
            >
              <RefreshCw className="w-3 h-3" />
              retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-border bg-secondary/20"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about skills, projects, experience…"
          className="flex-1 bg-input border-border focus-visible:ring-primary/40 text-sm placeholder:text-muted-foreground/50 font-mono"
          disabled={isWaiting || isStreaming}
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isWaiting || isStreaming}
          className="shrink-0 bg-primary hover:bg-primary/80 text-primary-foreground disabled:opacity-30"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
});

export default ChatInterface;

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "submitted" || status === "streaming") {
    return (
      <div className="ml-auto flex items-center gap-1.5 text-xs font-mono text-yellow-400">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        thinking…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="ml-auto flex items-center gap-1.5 text-xs font-mono text-destructive">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
        error
      </div>
    );
  }
  return (
    <div className="ml-auto flex items-center gap-1.5 text-xs font-mono text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      online
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
      className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full border ${
          isUser
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-secondary border-border text-muted-foreground"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
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
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {part.text}
              </ReactMarkdown>
              {/* Blinking cursor on the actively streaming text part */}
              {part.state === "streaming" && (
                <span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />
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
      className="flex items-end gap-2.5"
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
