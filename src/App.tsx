import { useEffect, useMemo, useState } from 'react'
import { CarbonChart } from './components/CarbonChart'
import { ProcessTable } from './components/ProcessTable'
import { ReasoningModal } from './components/ReasoningModal'
import { useSystemStore } from './store/systemStore'

function App() {
  const {
    clock,
    carbon,
    forecast,
    processes,
    decisionMeta,
    schedulerCycle,
    lastDecisionAt,
    tick,
    refreshCarbon,
    runScheduler,
  } = useSystemStore((state) => state)

  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      tick()
    }, 1000)

    return () => window.clearInterval(id)
  }, [tick])

  useEffect(() => {
    let active = true
    const loop = async () => {
      await refreshCarbon()
      if (!active) {
        return
      }
      await runScheduler()
    }

    loop()
    const id = window.setInterval(() => {
      void loop()
    }, 60000)

    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [refreshCarbon, runScheduler])

  const selectedProcess = useMemo(
    () => processes.find((process) => process.id === selectedProcessId),
    [processes, selectedProcessId],
  )

  const nextCleanSlot = useMemo(() => forecast.find((point) => point.intensity <= 180), [forecast])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 p-4 text-terminal-text md:p-8">
      <header className="rounded-lg border border-terminal-line bg-terminal-panel p-4 shadow-neon">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-terminal-accent">GridTasks</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100 md:text-4xl">
              Carbon-Aware Process Scheduler
            </h1>
          </div>
          <div className="space-y-1 text-right text-sm text-slate-300">
            <div>System Clock: {new Date(clock).toLocaleTimeString()}</div>
            <div>Decision Cycles: {schedulerCycle}</div>
            <div>
              Last Scheduler Run:{' '}
              {lastDecisionAt ? new Date(lastDecisionAt).toLocaleTimeString() : 'Pending'}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-terminal-line bg-terminal-panel p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Grid Intensity</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">
            {carbon ? `${carbon.intensity} gCO2/kWh` : '--'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {carbon ? `${carbon.region} • ${carbon.index}` : 'Waiting for feed...'}
          </p>
        </div>
        <div className="rounded-lg border border-terminal-line bg-terminal-panel p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Data Source</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">
            {carbon?.source === 'LIVE_API' ? 'Live API' : 'Simulated Grid'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {carbon?.observedAt ? new Date(carbon.observedAt).toLocaleString() : 'Pending'}
          </p>
        </div>
        <div className="rounded-lg border border-terminal-line bg-terminal-panel p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Next Clean Window</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">
            {nextCleanSlot ? new Date(nextCleanSlot.time).toLocaleTimeString() : 'Unknown'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {nextCleanSlot ? `${nextCleanSlot.intensity} gCO2/kWh predicted` : 'No clean forecast'}
          </p>
        </div>
      </section>

      <CarbonChart forecast={forecast} />

      <section>
        <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-slate-300">System Monitor</h2>
        <ProcessTable
          processes={processes}
          decisionMeta={decisionMeta}
          onInspectDecision={setSelectedProcessId}
        />
      </section>

      <ReasoningModal
        open={Boolean(selectedProcessId)}
        processName={selectedProcess?.name ?? ''}
        data={selectedProcessId ? decisionMeta[selectedProcessId] : undefined}
        onClose={() => setSelectedProcessId(null)}
      />
    </main>
  )
}

export default App
