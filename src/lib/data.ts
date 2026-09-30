import indices from '@/indices.json'

export type IndexMeta = (typeof indices)[number]
export const INDICES: IndexMeta[] = indices

type RawRow = [date: string, open: number, high: number, low: number, close: number]
export interface IndexFile {
  id: string
  name: string
  yahoo: string
  asof: string
  fetchedAt: string
  rows: RawRow[]
}

export interface Day {
  date: string
  open: number
  high: number
  low: number
  close: number
  /** high − open: how far the day climbed above its start, in points */
  up: number
  /** open − low: how far the day fell below its start, in points */
  down: number
  /** high − low, in index points */
  range: number
  /** range as % of the day's open */
  rangePct: number
  /** close-to-close change vs the previous trading day, % */
  chgPct: number | null
}

export const PERIODS = [
  { id: '1M', months: 1 },
  { id: '6M', months: 6 },
  { id: '1Y', months: 12 },
  { id: '3Y', months: 36 },
  { id: '5Y', months: 60 },
] as const
export type PeriodId = (typeof PERIODS)[number]['id']

export async function loadIndex(id: string): Promise<IndexFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${id}.json`)
  if (!res.ok) throw new Error(`Couldn't load ${id} data (HTTP ${res.status})`)
  return res.json()
}

export function toDays(rows: RawRow[]): Day[] {
  return rows.map(([date, open, high, low, close], i) => {
    const prev = i > 0 ? rows[i - 1][4] : null
    return {
      date,
      open,
      high,
      low,
      close,
      up: high - open,
      down: open - low,
      range: high - low,
      rangePct: ((high - low) / open) * 100,
      chgPct: prev ? ((close - prev) / prev) * 100 : null,
    }
  })
}

export function inPeriod(days: Day[], period: PeriodId): Day[] {
  if (!days.length) return days
  const months = PERIODS.find((p) => p.id === period)!.months
  const cut = new Date(`${days.at(-1)!.date}T00:00:00Z`)
  cut.setUTCMonth(cut.getUTCMonth() - months)
  const cutStr = cut.toISOString().slice(0, 10)
  return days.filter((d) => d.date > cutStr)
}

export const fmt = (v: number | null, digits = 2) =>
  v == null ? '—' : v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
