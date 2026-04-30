import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  CarbonForecastPoint,
  SchedulerDecisionResult,
  SimProcess,
} from '../types'

const validActions = new Set(['PAUSE', 'RESUME', 'THROTTLE'])

const nextCleanEta = (forecast: CarbonForecastPoint[]): string | undefined => {
  const next = forecast.find((point) => point.intensity <= 180)
  return next?.time
}

const fallbackScheduler = (
  intensity: number,
  forecast: CarbonForecastPoint[],
  tasks: SimProcess[],
): SchedulerDecisionResult => {
  const cleanEta = nextCleanEta(forecast)
  const decisions: SchedulerDecisionResult['decisions'] = {}
  const cleanSoon = forecast.some((point, idx) => idx < 6 && point.intensity <= 180)

  for (const task of tasks) {
    if (task.type !== 'BACKGROUND' || task.status === 'COMPLETED') {
      continue
    }

    if (intensity > 320 && cleanSoon && task.energy === 'HIGH') {
      decisions[task.id] = {
        action: 'PAUSE',
        reasoning: `Grid ${intensity}gCO2/kWh now. Cleaner window soon. Pause high-energy task.`,
        eta: cleanEta,
      }
      continue
    }

    if (intensity > 280 && task.energy !== 'LOW') {
      decisions[task.id] = {
        action: 'THROTTLE',
        reasoning: `Grid still dirty at ${intensity}gCO2/kWh. Throttle medium/high energy task.`,
        eta: cleanEta,
      }
      continue
    }

    decisions[task.id] = {
      action: 'RESUME',
      reasoning: `Grid acceptable for execution. Resume normal throughput.`,
      eta: cleanEta,
    }
  }

  return { decisions, model: 'fallback-heuristic' }
}

const extractJson = (text: string): string | null => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1]
  }

  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    return null
  }
  return text.slice(first, last + 1)
}

export const getSchedulingDecision = async (params: {
  currentIntensity: number
  forecast: CarbonForecastPoint[]
  backgroundTasks: SimProcess[]
}): Promise<SchedulerDecisionResult> => {
  const { currentIntensity, forecast, backgroundTasks } = params
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

  if (!apiKey) {
    return fallbackScheduler(currentIntensity, forecast, backgroundTasks)
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are OS kernel carbon-aware scheduler.
Current carbon intensity: ${currentIntensity} gCO2/kWh.
Forecast next 24h:
${forecast.map((p) => `${p.time} => ${p.intensity}`).join('\n')}

Background tasks:
${backgroundTasks
  .map(
    (task) =>
      `${task.id} | ${task.name} | energy=${task.energy} | status=${task.status} | progress=${task.progress.toFixed(1)}%`,
  )
  .join('\n')}

Rules:
- Never output markdown.
- Only output strict JSON.
- Decision action must be one of: PAUSE, RESUME, THROTTLE.
- Prioritize minimizing carbon impact without starving all work.
- If cleaner window soon, pause highest-energy workloads.

JSON schema:
{
  "decisions": {
    "processId": {
      "action": "PAUSE|RESUME|THROTTLE",
      "reasoning": "short explanation",
      "eta": "ISO time or null"
    }
  }
}
`

    const response = await model.generateContent(prompt)
    const raw = response.response.text()
    const jsonText = extractJson(raw)
    if (!jsonText) {
      throw new Error('Gemini response did not include JSON')
    }

    const parsed = JSON.parse(jsonText) as {
      decisions?: Record<string, { action?: string; reasoning?: string; eta?: string | null }>
    }

    const decisions: SchedulerDecisionResult['decisions'] = {}
    for (const task of backgroundTasks) {
      const item = parsed.decisions?.[task.id]
      if (!item || !item.action || !validActions.has(item.action)) {
        continue
      }
      decisions[task.id] = {
        action: item.action as 'PAUSE' | 'RESUME' | 'THROTTLE',
        reasoning: item.reasoning ?? 'No reasoning provided by model.',
        eta: item.eta ?? undefined,
      }
    }

    if (Object.keys(decisions).length === 0) {
      throw new Error('Gemini returned no valid decisions')
    }

    return { decisions, model: 'gemini-1.5-flash' }
  } catch {
    return fallbackScheduler(currentIntensity, forecast, backgroundTasks)
  }
}
