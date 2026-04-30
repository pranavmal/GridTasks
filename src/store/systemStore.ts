import { create } from 'zustand'
import { initialProcesses } from '../data/processes'
import { fetchCarbonData } from '../services/carbonService'
import { getSchedulingDecision } from '../services/geminiScheduler'
import type { CarbonForecastPoint, CarbonSnapshot, DecisionMeta, SimProcess } from '../types'

interface SystemState {
  clock: number
  processes: SimProcess[]
  carbon: CarbonSnapshot | null
  forecast: CarbonForecastPoint[]
  schedulerCycle: number
  lastDecisionAt?: string
  decisionMeta: Record<string, DecisionMeta>
  tick: () => void
  refreshCarbon: () => Promise<void>
  runScheduler: () => Promise<void>
}

const progressByEnergy: Record<SimProcess['energy'], number> = {
  HIGH: 1.4,
  MEDIUM: 0.9,
  LOW: 0.45,
}

const clampProgress = (value: number): number => Math.min(100, Math.max(0, value))

const applyKernelTick = (process: SimProcess): SimProcess => {
  if (process.status === 'COMPLETED') {
    return process
  }

  if (process.status === 'PAUSED_ECO') {
    return process
  }

  const base = progressByEnergy[process.energy]
  const delta = process.status === 'THROTTLED' ? base * 0.35 : base
  const nextProgress = clampProgress(process.progress + delta)

  if (nextProgress >= 100) {
    return { ...process, progress: 100, status: 'COMPLETED' }
  }

  return { ...process, progress: nextProgress }
}

export const useSystemStore = create<SystemState>((set, get) => ({
  clock: Date.now(),
  processes: initialProcesses,
  carbon: null,
  forecast: [],
  schedulerCycle: 0,
  decisionMeta: {},
  tick: () => {
    set((state) => ({
      clock: Date.now(),
      processes: state.processes.map(applyKernelTick),
    }))
  },
  refreshCarbon: async () => {
    const data = await fetchCarbonData()
    set({
      carbon: data.current,
      forecast: data.forecast,
    })
  },
  runScheduler: async () => {
    const state = get()
    if (!state.carbon || state.forecast.length === 0) {
      return
    }

    const backgroundTasks = state.processes.filter(
      (process) => process.type === 'BACKGROUND' && process.status !== 'COMPLETED',
    )

    const result = await getSchedulingDecision({
      currentIntensity: state.carbon.intensity,
      forecast: state.forecast,
      backgroundTasks,
    })
    const at = new Date().toISOString()

    set((currentState) => {
      const updatedProcesses = currentState.processes.map((process) => {
        if (process.type !== 'BACKGROUND' || process.status === 'COMPLETED') {
          return process
        }

        const decision = result.decisions[process.id]
        if (!decision) {
          return process
        }

        let nextStatus: SimProcess['status']
        if (decision.action === 'PAUSE') {
          nextStatus = 'PAUSED_ECO'
        } else if (decision.action === 'THROTTLE') {
          nextStatus = 'THROTTLED'
        } else {
          nextStatus = 'RUNNING'
        }
        return { ...process, status: nextStatus }
      })

      const nextMeta = { ...currentState.decisionMeta }
      for (const [processId, decision] of Object.entries(result.decisions)) {
        nextMeta[processId] = {
          action: decision.action,
          reasoning: decision.reasoning,
          eta: decision.eta,
          triggerCarbon: currentState.carbon?.intensity ?? 0,
          at,
        }
      }

      return {
        processes: updatedProcesses,
        decisionMeta: nextMeta,
        schedulerCycle: currentState.schedulerCycle + 1,
        lastDecisionAt: at,
      }
    })
  },
}))
