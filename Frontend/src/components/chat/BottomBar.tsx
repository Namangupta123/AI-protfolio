"use client";

import { ArrowUp } from "lucide-react";

const RESUME_URL = process.env.NEXT_PUBLIC_RESUME_URL;
interface BottomBarProps {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}

export function BottomBar({ input, setInput, onSubmit, disabled }: BottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md z-20">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-3 pb-4 sm:pb-5">
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 sm:px-5 py-2.5 sm:py-3 shadow-sm input-glow transition-all"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about Naman..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            disabled={disabled}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full gradient-bg text-white disabled:opacity-30 transition-opacity hover:opacity-90"
            aria-label="Send"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-2">
          Answers based on resume and work history.{" "}
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            Resume ↓
          </a>
        </p>
      </div>
    </div>
  );
}
