# Modern UI Redesign — AI Portfolio

## Overview

Redesign the frontend to match a clean, ChatGPT-style full-page layout with a purple-pink color gamut, light/dark toggle, and a fixed bottom input that transitions from an empty hero state to an inline chat state.

---

## Color & Theme System

### Token sets (globals.css)

| Token | Light | Dark |
|---|---|---|
| `--background` | `#FFFFFF` | `#09090B` |
| `--foreground` | `#09090B` | `#FAFAFA` |
| `--card` | `#F4F4F5` | `#18181B` |
| `--border` | `#E4E4E7` | `#27272A` |
| `--input` | `#F4F4F5` | `#18181B` |
| `--muted-foreground` | `#71717A` | `#A1A1AA` |
| `--primary` | `#7C3AED` (violet-600) | `#8B5CF6` (violet-500) |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--destructive` | `#EF4444` | `#EF4444` |

### Gradient (hero + send button)
`linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)`

Applied to:
- "Hello." heading text (via `background-clip: text`)
- The period "." accent (pink end of gradient)
- Send button background

### Theme provider
- Install `next-themes`
- Wrap `layout.tsx` body in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
- `ThemeToggle` component: Sun icon (light) / Moon icon (dark), placed in top-right navbar

---

## Layout Architecture

### Two-state page design

**Empty state** (no messages beyond the welcome):
- Full viewport, flex column
- Centered vertically: gradient "Hello." heading + subtitle + suggestion chips
- Fixed bottom bar: pill input + send button + "Resume ↓" link below

**Chat state** (after first user message):
- Heading + chips animate out (fade + slide up, ~300ms)
- Messages scroll in above the fixed bottom bar
- Scrollable message area fills available height between navbar and bottom bar
- Auto-scroll to bottom on new tokens

### Navbar (top)
- Left: `naman.dev` monospace branding with `</>` icon
- Right: GitHub, LinkedIn, Email icons + ThemeToggle
- Thin bottom border, subtle backdrop blur on scroll
- Sticky top-0

### Hero (empty state only)
```
Hello.                   ← gradient text, 5xl–6xl, bold
Ask anything about Naman. ← dark/light foreground, 4xl–5xl, bold
                          ← spacing
[chip] [chip] [chip] [chip]  ← suggestion chips row
```

### Suggestion chips
- Pill shape, rounded-full
- Border: `border-border`, background: transparent
- Hover: subtle violet tint border + background
- Font: system sans (not monospace)
- Disappear (fade out) when chat state begins

### Bottom bar (fixed, always visible)
```
┌─────────────────────────────────────────────────┐
│  Ask anything about Naman...          [→ send]  │
└─────────────────────────────────────────────────┘
      Answers based on resume and work history.  Resume ↓
```
- Input: large rounded-full pill, max-w-2xl centered
- Send button: circular, gradient background, arrow icon
- "Resume ↓": small muted text link below the input, downloads the resume PDF
- Mock resume href: `#` (placeholder until real PDF is added)

---

## Component Changes

### `layout.tsx`
- Add `next-themes` ThemeProvider
- Keep Inter + JetBrains Mono fonts

### `globals.css`
- Replace current dark-only tokens with light + dark token sets
- Keep `.glow-border` utility but soften it in light mode
- Keep scrollbar styling

### `page.tsx` (major refactor)
- Tracks `hasChat: boolean` state (true after first message sent)
- Renders hero section with AnimatePresence exit animation
- Renders `<MessageList />` when hasChat is true
- Renders fixed `<BottomBar />` always
- Passes `sendMessage`, `input`, `setInput`, `status` down as props

### `ChatInterface.tsx` → split into:
- `MessageList.tsx` — renders scrollable messages, typing indicator, error banner. Accepts `messages`, `status`, `error`, `regenerate` as props.
- `BottomBar.tsx` — fixed bottom bar with pill input, send button, resume link. Accepts `input`, `setInput`, `onSubmit`, `disabled` as props.
- `useChat` hook stays in `page.tsx` so both components share state

### `ThemeToggle.tsx` (new)
- Uses `useTheme` from next-themes
- Sun icon when dark, Moon icon when light
- Smooth icon swap with AnimatePresence

---

## Animations

| Element | Animation |
|---|---|
| Hero heading | fade-in + slide-up on mount |
| Chips | staggered fade-in (50ms delay per chip) |
| Hero exit | fade-out + slide-up when hasChat becomes true |
| Chat messages | fade-in + slide-up per bubble (existing behavior, keep) |
| Typing indicator | existing bouncing dots (keep) |
| Theme toggle icon | crossfade Sun ↔ Moon |

---

## Files Changed

| File | Change |
|---|---|
| `src/app/globals.css` | New light+dark token sets, gradient utility |
| `src/app/layout.tsx` | Add ThemeProvider |
| `src/app/page.tsx` | Full refactor — two-state layout, owns useChat |
| `src/components/chat/ChatInterface.tsx` | Extract into MessageList + BottomBar |
| `src/components/chat/MessageList.tsx` | New — scrollable messages |
| `src/components/chat/BottomBar.tsx` | New — fixed input bar |
| `src/components/ThemeToggle.tsx` | New — sun/moon toggle |

---

## Out of Scope

- Share link button (explicitly excluded)
- Real resume PDF (mock `#` link used)
- Backend changes
- Mobile-specific breakpoints beyond basic responsiveness
