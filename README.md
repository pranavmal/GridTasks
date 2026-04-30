# GridTasks

GridTasks is a carbon-aware OS utility simulator. It runs a mock process scheduler that:

- tracks active critical/background tasks
- fetches live UK carbon-intensity data (with fallback simulated grid)
- calls Gemini 1.5 Flash for pause/throttle/resume decisions
- applies decisions in a closed loop every 60s
- surfaces AI reasoning + trigger metrics in the UI

## Stack

- React + TypeScript + Vite
- Zustand for centralized "kernel" state
- Tailwind CSS for terminal-style dark UI
- Google Generative AI SDK (`@google/generative-ai`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file and add Gemini key:
   ```bash
   cp .env.example .env
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_GEMINI_API_KEY` (optional): if missing or invalid, app auto-falls back to heuristic scheduler logic.

## Available Scripts

- `npm run dev` - run local dev server
- `npm run build` - type-check + production build
- `npm run lint` - run ESLint
- `npm run preview` - preview production build

## Core Behavior

1. **Kernel Tick**: every second, running/throttled tasks progress; paused tasks hold; tasks complete at 100%.
2. **Carbon Monitor**: every 60 seconds fetches current intensity + 24h forecast.
3. **AI Scheduler**: sends intensity + forecast + background tasks to Gemini; receives per-process JSON actions.
4. **Safety Rule**: critical tasks are never paused by scheduler.
5. **Reasoning Trace**: decisions stored in state and shown via eco icon pop-over.
