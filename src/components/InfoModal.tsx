interface InfoModalProps {
  title: string
  description: string
  loading: boolean
  open: boolean
  onClose: () => void
}

export const InfoModal = ({ title, description, loading, open, onClose }: InfoModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg bg-terminal-panel p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-terminal-accent">Get More Info</h3>
            <p className="mt-1 text-lg text-slate-100">{title}</p>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-terminal-line/40"
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>
        <p className="text-sm text-slate-200">{loading ? 'Generating explanation…' : description}</p>
      </div>
    </div>
  )
}
