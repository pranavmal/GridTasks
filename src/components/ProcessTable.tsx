import { Clock3, Leaf } from 'lucide-react'
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

export const ProcessTable = ({
  processes,
  decisionMeta,
  onInspectDecision,
}: ProcessTableProps) => (
  <div className="overflow-hidden rounded-lg border border-terminal-line bg-terminal-panel/90 shadow-neon">
    <table className="w-full border-collapse text-left text-sm">
      <thead className="bg-slate-900/70 text-xs uppercase tracking-widest text-slate-400">
        <tr>
          <th className="px-4 py-3">Process</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Energy</th>
          <th className="px-4 py-3">Progress</th>
          <th className="px-4 py-3">Status</th>
        </tr>
      </thead>
      <tbody>
        {processes.map((process) => {
          const aiTagged = Boolean(decisionMeta[process.id])
          const showEcoIcon = process.status === 'PAUSED_ECO' || process.status === 'THROTTLED'
          return (
            <tr
              key={process.id}
              className={`border-t border-terminal-line/60 ${
                process.status === 'RUNNING' ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''
              }`}
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
                    className="h-1.5 rounded bg-cyan-400"
                    style={{ width: `${process.progress}%` }}
                  />
                </div>
              </td>
              <td className={`px-4 py-3 font-semibold ${statusClass[process.status]}`}>
                <div className="inline-flex items-center gap-2">
                  <span>{statusLabel[process.status]}</span>
                  {showEcoIcon && aiTagged && (
                    <button
                      type="button"
                      className="rounded border border-terminal-line p-1 hover:bg-terminal-line/50"
                      onClick={() => onInspectDecision(process.id)}
                      title="View AI reasoning"
                    >
                      {process.status === 'PAUSED_ECO' ? (
                        <Leaf className="h-3.5 w-3.5" />
                      ) : (
                        <Clock3 className="h-3.5 w-3.5" />
                      )}
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
