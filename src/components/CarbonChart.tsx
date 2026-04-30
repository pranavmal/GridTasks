import type { CarbonForecastPoint } from '../types'

interface CarbonChartProps {
  forecast: CarbonForecastPoint[]
}

export const CarbonChart = ({ forecast }: CarbonChartProps) => {
  if (!forecast.length) {
    return (
      <div className="rounded-lg border border-terminal-line bg-terminal-panel p-4 text-sm text-slate-400">
        No forecast data yet.
      </div>
    )
  }

  const width = 720
  const height = 180
  const padding = 20
  const values = forecast.map((point) => point.intensity)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)

  const points = forecast
    .map((point, index) => {
      const x = padding + (index / (forecast.length - 1)) * (width - padding * 2)
      const y =
        height - padding - ((point.intensity - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  const current = forecast[0]?.intensity ?? 0
  const cleanThresholdY =
    height - padding - ((180 - min) / range) * (height - padding * 2)

  return (
    <div className="rounded-lg border border-terminal-line bg-terminal-panel/90 p-4 shadow-neon">
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
        <span>24h Carbon Forecast</span>
        <span>{current} gCO2/kWh now</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
        <line
          x1={padding}
          x2={width - padding}
          y1={cleanThresholdY}
          y2={cleanThresholdY}
          stroke="#36D68F"
          strokeDasharray="4 5"
          strokeWidth={1}
          opacity={0.75}
        />
        <polyline
          fill="none"
          stroke="#60A5FA"
          strokeWidth={2.5}
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-2 text-xs text-slate-400">
        Dashed line = clean window threshold (180 gCO2/kWh)
      </div>
    </div>
  )
}
