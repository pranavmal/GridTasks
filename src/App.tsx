import { useEffect, useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { CarbonChart } from './components/CarbonChart'
import { InfoModal } from './components/InfoModal'
import { ProcessTable } from './components/ProcessTable'
import { ReasoningModal } from './components/ReasoningModal'
import { generateInfoExplanation } from './services/explainService'
import { useSystemStore } from './store/systemStore'

type InfoTopic = 'grid-intensity' | 'next-clean-window' | 'forecast-chart'

const formatDatetimeLocal = (timestamp: number): string => {
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function App() {
  const {
    clock,
    carbon,
    forecast,
    forecastStaleMessage,
    processes,
    decisionMeta,
    schedulerCycle,
    lastDecisionAt,
    tick,
    setClock,
    refreshCarbon,
    runScheduler,
  } = useSystemStore((state) => state)

  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [dateInput, setDateInput] = useState<string>(() => formatDatetimeLocal(Date.now()))
  const [nowTs, setNowTs] = useState<number>(() => Date.now())
  const [openInfoTopic, setOpenInfoTopic] = useState<InfoTopic | null>(null)
  const [infoCache, setInfoCache] = useState<Partial<Record<InfoTopic, string>>>({})
  const [loadingTopic, setLoadingTopic] = useState<InfoTopic | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      tick()
      setNowTs(Date.now())
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
  const isFutureClock = clock > nowTs

  const openInfo = async (topic: InfoTopic) => {
    setOpenInfoTopic(topic)
    if (infoCache[topic] || loadingTopic) {
      return
    }
    setLoadingTopic(topic)
    const description = await generateInfoExplanation(topic)
    setInfoCache((current) => ({ ...current, [topic]: description }))
    setLoadingTopic(null)
  }

  const infoTitle: Record<InfoTopic, string> = {
    'grid-intensity': 'Grid Intensity',
    'next-clean-window': 'Next Clean Window',
    'forecast-chart': '24h Forecast Graph',
  }

  const applyDateSelection = async () => {
    const selectedTime = new Date(dateInput).getTime()
    if (Number.isNaN(selectedTime)) {
      return
    }
    setClock(selectedTime)
    await refreshCarbon()
    await runScheduler()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 p-4 text-terminal-text md:p-8">
      <header className="rounded-lg bg-terminal-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-terminal-accent">GridTasks</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100 md:text-4xl">
              Carbon Focused Task Manager
            </h1>
          </div>
          <div className="space-y-1 text-right text-sm text-slate-300">
            <div>Clock: {new Date(clock).toLocaleTimeString()}</div>
            <div>Decision Cycles: {schedulerCycle}</div>
            <div>
              Last Scheduler Run:{' '}
              {lastDecisionAt ? new Date(lastDecisionAt).toLocaleTimeString() : 'Pending'}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 pt-3">
          <label className="text-xs uppercase tracking-wider text-slate-400">
            Change date and time
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              className="mt-1 block rounded bg-[#1a1a1a] px-2 py-1 text-sm text-slate-200"
            />
          </label>
          <button
            type="button"
            className="rounded bg-[#1a1a1a] px-3 py-2 text-xs uppercase tracking-wider text-slate-200 hover:bg-terminal-line/50"
            onClick={() => void applyDateSelection()}
          >
            Apply Changes
          </button>
          <button
            type="button"
            className="rounded bg-[#1a1a1a] px-3 py-2 text-xs uppercase tracking-wider text-slate-200 hover:bg-terminal-line/50"
            onClick={() => {
              const now = Date.now()
              setClock(now)
              setDateInput(formatDatetimeLocal(now))
              void refreshCarbon()
              void runScheduler()
            }}
          >
            Reset to Now
          </button>
          {isFutureClock && (
            <div className="text-xs text-amber-300">
              Future date mode active. Scheduler compares ETA against selected demo time.
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-terminal-panel p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
            Grid Intensity
            <button
              type="button"
              className="rounded p-1 text-slate-300 hover:bg-terminal-line/40"
              onClick={() => void openInfo('grid-intensity')}
              title="Get more info"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">
            {carbon ? `${carbon.intensity} gCO2/kWh` : '--'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {carbon ? `${carbon.region} • ${carbon.index}` : 'Waiting for feed...'}
          </p>
        </div>
        <div className="rounded-lg bg-terminal-panel p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Data Source</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">
            {carbon?.source === 'LIVE_API' ? 'Live API' : 'Simulated Grid'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {carbon?.observedAt ? new Date(carbon.observedAt).toLocaleString() : 'Pending'}
          </p>
        </div>
        <div className="rounded-lg bg-terminal-panel p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
            Next Clean Window
            <button
              type="button"
              className="rounded p-1 text-slate-300 hover:bg-terminal-line/40"
              onClick={() => void openInfo('next-clean-window')}
              title="Get more info"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">
            {nextCleanSlot ? new Date(nextCleanSlot.time).toLocaleTimeString() : 'Unknown'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {nextCleanSlot ? `${nextCleanSlot.intensity} gCO2/kWh predicted` : 'No clean forecast'}
          </p>
        </div>
      </section>

      <CarbonChart
        forecast={forecast}
        staleMessage={forecastStaleMessage}
        onInspectInfo={() => void openInfo('forecast-chart')}
      />

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

      <InfoModal
        open={Boolean(openInfoTopic)}
        title={openInfoTopic ? infoTitle[openInfoTopic] : ''}
        description={openInfoTopic ? infoCache[openInfoTopic] ?? '' : ''}
        loading={Boolean(openInfoTopic && loadingTopic === openInfoTopic)}
        onClose={() => setOpenInfoTopic(null)}
      />
    </main>
  )
}

export default App
