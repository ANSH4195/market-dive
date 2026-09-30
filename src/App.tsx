import { useEffect, useMemo, useState } from 'react'
import { DayTable } from '@/components/DayTable'
import { Segmented } from '@/components/Segmented'
import { StatCards } from '@/components/StatCards'
import {
  type Day,
  fmtDate,
  INDICES,
  type IndexFile,
  inPeriod,
  loadIndex,
  PERIODS,
  type PeriodId,
  summarize,
  toDays,
} from '@/lib/data'

const stored = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const store = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {}
}

export default function App() {
  const [indexId, setIndexId] = useState(() => INDICES.find((i) => i.id === stored('md:index'))?.id ?? INDICES[0].id)
  const [period, setPeriod] = useState<PeriodId>(() => PERIODS.find((p) => p.id === stored('md:period'))?.id ?? '5Y')
  const [file, setFile] = useState<IndexFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setError(null)
    loadIndex(indexId)
      .then((f) => live && setFile(f))
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [indexId])

  const allDays = useMemo<Day[]>(() => (file?.id === indexId ? toDays(file.rows) : []), [file, indexId])
  const days = useMemo(() => inPeriod(allDays, period), [allDays, period])
  const meta = INDICES.find((i) => i.id === indexId)!

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="brut w-fit rotate-[-2deg] bg-pink px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase shadow-brut-sm">
            {meta.exchange} · {meta.yahoo}
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">Market Dive</h1>
          <p className="max-w-[60ch] text-ink-soft">
            How far each index travels inside a single day: the high minus the low, in points, for every trading
            session.{file && ` Data through ${fmtDate(file.asof)}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Segmented
            label="Index"
            value={indexId}
            onChange={(v) => {
              setIndexId(v)
              store('md:index', v)
            }}
            options={INDICES.map((i) => ({ value: i.id, label: i.name }))}
          />
          <Segmented
            label="Period"
            value={period}
            onChange={(v) => {
              setPeriod(v)
              store('md:period', v)
            }}
            options={PERIODS.map((p) => ({ value: p.id, label: p.id }))}
          />
        </div>
      </header>

      {error && <div className="brut bg-peach p-4 font-semibold">{error}. Try reloading the page.</div>}

      {!error && !days.length && (
        <div className="brut animate-pulse bg-lilac p-10 text-center font-semibold">Loading {meta.name}…</div>
      )}

      {days.length > 0 && (
        <>
          <StatCards s={summarize(days)} />
          {/* keyed so the date filter resets when the index or period changes */}
          <DayTable key={`${indexId}-${period}`} days={days} name={meta.name} />
        </>
      )}

      <footer className="text-xs text-ink-soft">
        Source: Yahoo Finance daily OHLC, refreshed every weekday after market close. Range % = (High − Low) ÷ Open.
        Days with missing or zero-width bars are dropped. Muhurat trading sessions are one hour long, so their ranges
        are tiny.
      </footer>
    </div>
  )
}
