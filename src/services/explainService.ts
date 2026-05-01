import { GoogleGenerativeAI } from '@google/generative-ai'

export type InfoTopic = 'grid-intensity' | 'next-clean-window' | 'forecast-chart'

const fallbackText: Record<InfoTopic, string> = {
  'grid-intensity':
    'Grid Intensity (gCO2/kWh) is estimated grams of CO2 emitted to produce one kilowatt-hour right now. Lower is cleaner. Region is data source area. Index groups intensity into CLEAN, MODERATE, or DIRTY bands.',
  'next-clean-window':
    'Next Clean Window is first forecast time where intensity drops to 180 gCO2/kWh or lower. Predicted value is expected intensity at that time. Scheduler can defer high-energy work until this slot to reduce carbon impact.',
  'forecast-chart':
    '24h Carbon Forecast plots predicted carbon intensity over next 48 half-hour points. X-axis is time, Y-axis is gCO2/kWh. Dashed threshold line marks 180 gCO2/kWh clean boundary. Lower line segments indicate better windows for background tasks.',
}

const extractJson = (text: string): string | null => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1]
  }

  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    return null
  }
  return text.slice(first, last + 1)
}

export const generateInfoExplanation = async (topic: InfoTopic): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) {
    return fallbackText[topic]
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: 'gemini-flash-lite-latest' })
    const prompt = `
Explain this dashboard metric for a non-expert demo audience.
Topic: ${topic}
Requirements:
- One paragraph, 70-110 words.
- Define variables and units clearly.
- Explain how user should interpret value.
- Keep practical and concise.
- No markdown.
- Return strict JSON only:
{"description":"..."}
`
    const response = await model.generateContent(prompt)
    const raw = response.response.text()
    const jsonText = extractJson(raw)
    if (!jsonText) {
      throw new Error('No JSON returned')
    }
    const parsed = JSON.parse(jsonText) as { description?: string }
    if (!parsed.description) {
      throw new Error('Missing description')
    }
    return parsed.description
  } catch {
    return fallbackText[topic]
  }
}
