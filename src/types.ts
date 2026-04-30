export type ProcessType = 'CRITICAL' | 'BACKGROUND'
export type EnergyConsumption = 'HIGH' | 'MEDIUM' | 'LOW'
export type ProcessStatus = 'RUNNING' | 'PAUSED_ECO' | 'THROTTLED' | 'COMPLETED'
export type SchedulerAction = 'PAUSE' | 'RESUME' | 'THROTTLE'

export interface SimProcess {
  id: string
  name: string
  type: ProcessType
  energy: EnergyConsumption
  progress: number
  status: ProcessStatus
}

export interface CarbonForecastPoint {
  time: string
  intensity: number
}

export interface CarbonSnapshot {
  region: string
  intensity: number
  index: 'CLEAN' | 'MODERATE' | 'DIRTY'
  source: 'LIVE_API' | 'SIMULATED_GRID'
  observedAt: string
}

export interface ProcessDecision {
  action: SchedulerAction
  reasoning: string
  eta?: string
}

export interface SchedulerDecisionResult {
  decisions: Record<string, ProcessDecision>
  model: 'gemini-1.5-flash' | 'fallback-heuristic'
}

export interface DecisionMeta {
  reasoning: string
  eta?: string
  action: SchedulerAction
  triggerCarbon: number
  at: string
}
