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
  forecastStaleMessage?: string
  schedulerCycle: number
  lastDecisionAt?: string
  decisionMeta: Record<string, DecisionMeta>
  tick: () => void
  setClock: (value: number) => void
  refreshCarbon: () => Promise<void>
  runScheduler: () => Promise<void>
}

const progressByEnergy: Record<SimProcess['energy'], number> = {
  HIGH: 1.4,
  MEDIUM: 0.9,
  LOW: 0.45,
}

const clampProgress = (value: number): number => Math.min(100, Math.max(0, value))
const parseEtaTimestamp = (value?: string): number | undefined => {
  if (!value) {
    return undefined
  }
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

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
  forecastStaleMessage: undefined,
  schedulerCycle: 0,
  decisionMeta: {},
  tick: () => {
    set((state) => ({
      clock: state.clock + 1000,
      processes: state.processes.map(applyKernelTick),
    }))
  },
  setClock: (value: number) => {
    set({ clock: value })
  },
  refreshCarbon: async () => {
    const state = get()
    const data = await fetchCarbonData({
      atTime: state.clock,
      existingForecast: state.forecast,
      existingCurrent: state.carbon,
    })
    set({
      carbon: data.current,
      forecast: data.forecast,
      forecastStaleMessage: data.meta.staleMessage,
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
      const now = currentState.clock
      const heldByEta = new Set<string>()
      const updatedProcesses = currentState.processes.map((process) => {
        if (process.type !== 'BACKGROUND' || process.status === 'COMPLETED') {
          return process
        }

        const decision = result.decisions[process.id]
        if (!decision) {
          return process
        }

        if (process.status === 'PAUSED_ECO' && decision.action !== 'PAUSE') {
          const holdUntil =
            parseEtaTimestamp(currentState.decisionMeta[process.id]?.eta) ??
            parseEtaTimestamp(decision.eta)
          if (holdUntil && now < holdUntil) {
            heldByEta.add(process.id)
            return process
          }
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
        if (heldByEta.has(processId)) {
          continue
        }
        const existingMeta = currentState.decisionMeta[processId]
        const currentProcess = currentState.processes.find((process) => process.id === processId)
        const existingEtaTs = parseEtaTimestamp(existingMeta?.eta)
        const nextEtaTs = parseEtaTimestamp(decision.eta)
        const keepExistingPauseEta =
          currentProcess?.status === 'PAUSED_ECO' &&
          decision.action === 'PAUSE' &&
          existingEtaTs !== undefined &&
          (nextEtaTs === undefined || nextEtaTs >= existingEtaTs)

        nextMeta[processId] = {
          action: decision.action,
          reasoning: decision.reasoning,
          eta: keepExistingPauseEta ? existingMeta?.eta : decision.eta,
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
