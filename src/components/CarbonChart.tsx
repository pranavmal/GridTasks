import { useMemo, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import type { CarbonForecastPoint } from '../types'

interface CarbonChartProps {
  forecast: CarbonForecastPoint[]
  staleMessage?: string
  onInspectInfo: () => void
}

export const CarbonChart = ({ forecast, staleMessage, onInspectInfo }: CarbonChartProps) => {
  const [activeX, setActiveX] = useState<number | null>(null)
  const width = 720
  const height = 180
  const padding = 20
  const values = forecast.map((point) => point.intensity)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const range = Math.max(1, max - min)

  const chartPoints = useMemo(
    () =>
      forecast.map((point, index) => {
        const totalSteps = Math.max(1, forecast.length - 1)
        const x = padding + (index / totalSteps) * (width - padding * 2)
        const y =
          height - padding - ((point.intensity - min) / range) * (height - padding * 2)
        return { ...point, x, y, index }
      }),
    [forecast, min, padding, range, width, height],
  )

  const points = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const current = forecast[0]?.intensity ?? 0
  const cleanThresholdY =
    height - padding - ((180 - min) / range) * (height - padding * 2)

  const focused = useMemo(() => {
    if (!chartPoints.length) {
      return undefined
    }
    if (activeX === null || chartPoints.length === 1) {
      return chartPoints[0]
    }

    const ratio = (activeX - padding) / (width - padding * 2)
    const exactIndex = Math.max(0, Math.min(1, ratio)) * (chartPoints.length - 1)
    const leftIndex = Math.floor(exactIndex)
    const rightIndex = Math.min(chartPoints.length - 1, leftIndex + 1)
    const blend = exactIndex - leftIndex
    const leftPoint = chartPoints[leftIndex]
    const rightPoint = chartPoints[rightIndex]
    if (!leftPoint || !rightPoint) {
      return chartPoints[0]
    }

    const leftTime = Date.parse(leftPoint.time)
    const rightTime = Date.parse(rightPoint.time)
    const time = Number.isNaN(leftTime) || Number.isNaN(rightTime)
      ? leftPoint.time
      : new Date(leftTime + (rightTime - leftTime) * blend).toISOString()
    const intensity = leftPoint.intensity + (rightPoint.intensity - leftPoint.intensity) * blend
    const y = height - padding - ((intensity - min) / range) * (height - padding * 2)

    return { ...leftPoint, x: activeX, y, intensity, time }
  }, [activeX, chartPoints, height, min, padding, range, width])

  if (!forecast.length) {
    return (
      <div className="rounded-lg bg-terminal-panel p-4 text-sm text-slate-400">
        No forecast data yet.
      </div>
    )
  }

  const updateActiveFromPointer = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const ctm = svg.getScreenCTM()
    if (!ctm) {
      return
    }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const svgPoint = point.matrixTransform(ctm.inverse())
    setActiveX(Math.max(padding, Math.min(width - padding, svgPoint.x)))
  }

  return (
    <div className="rounded-lg bg-terminal-panel/90 p-4">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
        <span className="inline-flex items-center gap-2">
          24h Carbon Forecast
          <button
            type="button"
            className="rounded p-1 text-slate-300 hover:bg-terminal-line/40"
            onClick={onInspectInfo}
            title="Get more info"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </span>
        <span>
          {(focused?.intensity ?? current).toFixed(1)} gCO2/kWh •{' '}
          {focused ? new Date(focused.time).toLocaleTimeString() : 'now'}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 w-full cursor-crosshair"
        onMouseMove={(event) => {
          updateActiveFromPointer(event.currentTarget, event.clientX, event.clientY)
        }}
        onMouseLeave={() => setActiveX(null)}
        onTouchMove={(event) => {
          const touch = event.touches[0]
          if (!touch) {
            return
          }
          updateActiveFromPointer(event.currentTarget, touch.clientX, touch.clientY)
        }}
      >
        <line
          x1={padding}
          x2={width - padding}
          y1={cleanThresholdY}
          y2={cleanThresholdY}
          stroke="#9CA3AF"
          strokeDasharray="4 5"
          strokeWidth={1}
          opacity={0.75}
        />
        <polyline
          fill="none"
          stroke="#D1D5DB"
          strokeWidth={2.5}
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {focused && (
          <>
            <line
              x1={focused.x}
              x2={focused.x}
              y1={padding}
              y2={height - padding}
              stroke="#6B7280"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <circle cx={focused.x} cy={focused.y} r={4} fill="#F3F4F6" />
          </>
        )}
      </svg>
      <div className="mt-2 text-xs text-slate-400">
        Hover over the graph to view CO2 intensity at a specific time.
      </div>
      {staleMessage && <div className="mt-1 text-xs text-amber-300">{staleMessage}</div>}
    </div>
  )
}
