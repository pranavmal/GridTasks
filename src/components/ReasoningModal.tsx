import type { DecisionMeta } from '../types'

interface ReasoningModalProps {
  processName: string
  data?: DecisionMeta
  open: boolean
  onClose: () => void
}

export const ReasoningModal = ({
  processName,
  data,
  open,
  onClose,
}: ReasoningModalProps) => {
  if (!open || !data) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg bg-terminal-panel p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-terminal-accent">
              AI Decision
            </h3>
            <p className="mt-1 text-lg text-slate-100">{processName}</p>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-terminal-line/40"
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>

        <div className="space-y-3 text-sm text-slate-200">
          <p>
            <span className="text-slate-400">Reasoning: </span>
            {data.reasoning}
          </p>
          <p>
            <span className="text-slate-400">Live Data: </span>
            Triggered at {data.triggerCarbon} gCO2/kWh
          </p>
          <p>
            <span className="text-slate-400">ETA: </span>
            {data.eta ? new Date(data.eta).toLocaleString() : 'No clean ETA available'}
          </p>
          <p>
            <span className="text-slate-400">Action: </span>
            {data.action}
          </p>
          <p>
            <span className="text-slate-400">Factors considered: </span>
            Carbon intensity level, clean-window forecast timing, task energy demand, process type, and
            current progress.
          </p>
        </div>
      </div>
    </div>
  )
}
