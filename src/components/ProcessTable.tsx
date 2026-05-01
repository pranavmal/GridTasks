import { useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import type { DecisionMeta, SimProcess } from '../types'

interface ProcessTableProps {
  processes: SimProcess[]
  decisionMeta: Record<string, DecisionMeta>
  onInspectDecision: (processId: string) => void
}

const statusClass: Record<SimProcess['status'], string> = {
  RUNNING: 'text-cyan-300',
  PAUSED_ECO: 'text-terminal-accent',
  THROTTLED: 'text-amber-300',
  COMPLETED: 'text-slate-400',
}

const statusLabel: Record<SimProcess['status'], string> = {
  RUNNING: 'Running',
  PAUSED_ECO: 'Eco-Pause',
  THROTTLED: 'Throttled',
  COMPLETED: 'Completed',
}

type SortKey = 'process' | 'type' | 'energy' | 'progress' | 'status'
type SortDirection = 'asc' | 'desc'

const typeOrder: Record<SimProcess['type'], number> = {
  CRITICAL: 0,
  BACKGROUND: 1,
}

const energyOrder: Record<SimProcess['energy'], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
}

const statusOrder: Record<SimProcess['status'], number> = {
  RUNNING: 0,
  THROTTLED: 1,
  PAUSED_ECO: 2,
  COMPLETED: 3,
}

export const ProcessTable = ({
  processes,
  decisionMeta,
  onInspectDecision,
}: ProcessTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('process')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedProcesses = useMemo(() => {
    const list = [...processes]
    list.sort((a, b) => {
      let comparison: number
      if (sortKey === 'process') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortKey === 'type') {
        comparison = typeOrder[a.type] - typeOrder[b.type]
      } else if (sortKey === 'energy') {
        comparison = energyOrder[a.energy] - energyOrder[b.energy]
      } else if (sortKey === 'progress') {
        comparison = a.progress - b.progress
      } else {
        comparison = statusOrder[a.status] - statusOrder[b.status]
      }

      if (comparison === 0) {
        comparison = a.name.localeCompare(b.name)
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
    return list
  }, [processes, sortDirection, sortKey])

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection('asc')
  }

  const sortIndicator = (key: SortKey): string =>
    sortKey === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div className="overflow-hidden rounded-lg bg-terminal-panel/90">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-widest text-slate-400">
          <tr>
            <th className="px-4 py-3">
              <button type="button" className="hover:text-slate-200" onClick={() => handleSort('process')}>
                Process{sortIndicator('process')}
              </button>
            </th>
            <th className="px-4 py-3">
              <button type="button" className="hover:text-slate-200" onClick={() => handleSort('type')}>
                Type{sortIndicator('type')}
              </button>
            </th>
            <th className="px-4 py-3">
              <button type="button" className="hover:text-slate-200" onClick={() => handleSort('energy')}>
                Energy{sortIndicator('energy')}
              </button>
            </th>
            <th className="px-4 py-3">
              <button type="button" className="hover:text-slate-200" onClick={() => handleSort('progress')}>
                Progress{sortIndicator('progress')}
              </button>
            </th>
            <th className="px-4 py-3">
              <button type="button" className="hover:text-slate-200" onClick={() => handleSort('status')}>
                Status{sortIndicator('status')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedProcesses.map((process) => {
            const aiTagged = Boolean(decisionMeta[process.id])
            return (
              <tr
                key={process.id}
                className={process.status === 'RUNNING' ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-200">{process.name}</div>
                  <div className="text-xs text-slate-500">{process.id}</div>
                </td>
                <td className="px-4 py-3 text-slate-300">{process.type}</td>
                <td className="px-4 py-3 text-slate-300">{process.energy}</td>
                <td className="px-4 py-3">
                  <div className="text-slate-300">{process.progress.toFixed(1)}%</div>
                  <div className="mt-1 h-1.5 w-32 rounded bg-slate-800">
                    <div
                      className="h-1.5 rounded bg-slate-400"
                      style={{ width: `${process.progress}%` }}
                    />
                  </div>
                </td>
                <td className={`px-4 py-3 font-semibold ${statusClass[process.status]}`}>
                  <div className="inline-flex items-center gap-2">
                    <span>{statusLabel[process.status]}</span>
                    {aiTagged && process.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-terminal-line/50"
                        onClick={() => onInspectDecision(process.id)}
                        title="View AI reasoning"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
