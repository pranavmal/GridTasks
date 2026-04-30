import type { CarbonForecastPoint, CarbonSnapshot } from '../types'

const CARBON_API_BASE = 'https://api.carbonintensity.org.uk'

const classifyIntensity = (value: number): CarbonSnapshot['index'] => {
  if (value <= 180) {
    return 'CLEAN'
  }
  if (value <= 300) {
    return 'MODERATE'
  }
  return 'DIRTY'
}

const formatApiTime = (date: Date) => `${date.toISOString().slice(0, 16)}Z`

const generateSimulatedForecast = (from = new Date()): CarbonForecastPoint[] => {
  const points: CarbonForecastPoint[] = []
  const start = new Date(from)
  start.setUTCMinutes(start.getUTCMinutes() - (start.getUTCMinutes() % 30), 0, 0)

  for (let i = 0; i < 48; i += 1) {
    const t = new Date(start.getTime() + i * 30 * 60 * 1000)
    const minutes = t.getUTCHours() * 60 + t.getUTCMinutes()
    const phase = ((minutes / 1440) * Math.PI * 2) - Math.PI / 2
    const base = 255 - 115 * Math.sin(phase)
    const noise = Math.sin(i * 0.7) * 16
    const intensity = Math.round(Math.min(460, Math.max(90, base + noise)))
    points.push({ time: t.toISOString(), intensity })
  }

  return points
}

export const fetchCarbonData = async (): Promise<{
  current: CarbonSnapshot
  forecast: CarbonForecastPoint[]
}> => {
  try {
    const now = new Date()
    const to = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${CARBON_API_BASE}/intensity`),
      fetch(
        `${CARBON_API_BASE}/intensity/${formatApiTime(now)}/${formatApiTime(to)}`,
      ),
    ])

    if (!currentRes.ok || !forecastRes.ok) {
      throw new Error('Carbon API request failed')
    }

    const currentJson = (await currentRes.json()) as {
      data?: Array<{ from: string; intensity: { forecast?: number; actual?: number } }>
    }
    const forecastJson = (await forecastRes.json()) as {
      data?: Array<{ from: string; intensity: { forecast?: number; actual?: number } }>
    }

    const currentEntry = currentJson.data?.[0]
    if (!currentEntry) {
      throw new Error('Carbon API returned empty current dataset')
    }

    const currentIntensity = Math.round(
      currentEntry.intensity.actual ?? currentEntry.intensity.forecast ?? 250,
    )

    const forecast = (forecastJson.data ?? [])
      .map((item) => ({
        time: item.from,
        intensity: Math.round(item.intensity.forecast ?? item.intensity.actual ?? 250),
      }))
      .slice(0, 48)

    if (!forecast.length) {
      throw new Error('Carbon API returned empty forecast dataset')
    }

    return {
      current: {
        region: 'UK National Grid',
        intensity: currentIntensity,
        index: classifyIntensity(currentIntensity),
        source: 'LIVE_API',
        observedAt: currentEntry.from,
      },
      forecast,
    }
  } catch {
    const forecast = generateSimulatedForecast()
    const currentIntensity = forecast[0]?.intensity ?? 250

    return {
      current: {
        region: 'Simulated Grid',
        intensity: currentIntensity,
        index: classifyIntensity(currentIntensity),
        source: 'SIMULATED_GRID',
        observedAt: new Date().toISOString(),
      },
      forecast,
    }
  }
}
