# GridTasks

GridTasks is a energy focused task manager simulator. It runs a mock process scheduler that:

- fetches live CO2 intensity data from the UK grid
- calls Gemini for pause/throttle/resume decisions
- applies decisions in a closed loop every 60s
- user can view AI reasoning + trigger metrics in the UI

## Stack

- React + TypeScript + Vite
- Zustand for centralized "kernel" state
- Tailwind CSS for terminal-style dark UI
- Google Generative AI SDK (`@google/generative-ai`)

## How to Run Locally

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
4. Environment Variables

- `VITE_GEMINI_API_KEY` (optional): if missing or invalid, app auto-falls back to heuristic scheduler logic.

## Available Scripts

- `npm run dev` - run local dev server
- `npm run build` - type-check + production build
- `npm run lint` - run ESLint
- `npm run preview` - preview production build

## Core Behavior

The program fetches live CO2 intensity data from the UK grid (https://api.carbonintensity.org.uk/) and calls Gemini with the relavent info (data from UK grid, task priority, and energy requirement). The AI then decides to keep the task running, throttle, or eco-pause appropiatley. The progress bars on the task update every second and shows the percent completion of the task. The user can click on info buttons across the app to view what the statistics mean and the AI's reasoning behind its decisions.