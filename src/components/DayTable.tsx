import { useMemo, useState } from 'react'
import { type Day, fmt } from '@/lib/data'

type Key = keyof Day
const COLS: { key: Key; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'open', label: 'Open' },
  { key: 'high', label: 'High' },
  { key: 'low', label: 'Low' },
  { key: 'close', label: 'Close' },
  { key: 'range', label: 'Range (pts)' },
  { key: 'rangePct', label: 'Range %' },
  { key: 'chgPct', label: 'Day chg %' },
]

export function DayTable({ days, title }: { days: Day[]; title: string }) {
  const [sortKey, setSortKey] = useState<Key>('date')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [q, setQ] = useState('')
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const rows = useMemo(() => {
    const filtered = q ? days.filter((d) => d.date.includes(q.trim())) : days
    return [...filtered].sort((a, b) => {
      const x = a[sortKey] ?? -Infinity
      const y = b[sortKey] ?? -Infinity
      const c = x < y ? -1 : x > y ? 1 : 0
      return dir === 'asc' ? c : -c
    })
  }, [days, q, sortKey, dir])

  const sortBy = (k: Key) => {
    setDir(k === sortKey && dir === 'desc' ? 'asc' : 'desc')
    setSortKey(k)
  }

  const copyCsv = async () => {
    const csv = [
      'date,open,high,low,close,range_pts,range_pct',
      ...rows.map((d) => [d.date, d.open, d.high, d.low, d.close, d.range.toFixed(2), d.rangePct.toFixed(3)].join(',')),
    ].join('\n')
    try {
      await navigator.clipboard.writeText(csv)
      setCopyMsg(`Copied ${rows.length} rows`)
    } catch {
      setCopyMsg('Clipboard blocked')
    }
    setTimeout(() => setCopyMsg(null), 1800)
  }

  return (
    <section className="brut overflow-hidden bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[2.5px] border-ink bg-lilac px-4 py-3">
        <h2 className="text-sm font-bold">{title}</h2>
        <div className="flex flex-wrap gap-3">
          <input
            id="date-filter"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter: 2024-06"
            aria-label="Filter by date"
            className="w-40 rounded-lg border-[2.5px] border-ink bg-white px-3 py-1.5 font-mono text-sm shadow-brut-sm placeholder:text-ink-soft/60"
          />
          <button
            type="button"
            onClick={copyCsv}
            className="brut-press cursor-pointer rounded-lg border-[2.5px] border-ink bg-butter px-3 py-1.5 text-sm font-bold shadow-brut-sm"
          >
            {copyMsg ?? 'Copy as CSV'}
          </button>
        </div>
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full border-collapse font-mono text-[13px] tabular-nums">
          <thead>
            <tr>
              {COLS.map((c, i) => (
                <th
                  key={c.key}
                  aria-sort={sortKey === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`sticky top-0 z-10 border-b-[2.5px] border-ink bg-butter p-0 ${i ? 'text-right' : 'text-left'}`}
                >
                  <button
                    type="button"
                    onClick={() => sortBy(c.key)}
                    className={`w-full cursor-pointer px-3 py-2.5 font-sans text-[11px] font-bold tracking-wider whitespace-nowrap uppercase ${
                      i ? 'text-right' : 'text-left'
                    } ${sortKey === c.key ? 'text-plum' : 'text-ink'}`}
                  >
                    {c.label}
                    {sortKey === c.key && (dir === 'asc' ? ' ▲' : ' ▼')}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.date} className="border-b border-lavender hover:bg-lilac">
                <td className="px-3 py-1.5 whitespace-nowrap">{d.date}</td>
                <td className="px-3 py-1.5 text-right">{fmt(d.open)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(d.high)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(d.low)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(d.close)}</td>
                <td className="px-3 py-1.5 text-right font-bold text-plum">{fmt(d.range)}</td>
                <td className="px-3 py-1.5 text-right">{fmt(d.rangePct)}</td>
                <td
                  className={`px-3 py-1.5 text-right ${d.chgPct == null ? '' : d.chgPct >= 0 ? 'text-up' : 'text-down'}`}
                >
                  {d.chgPct == null ? '—' : `${d.chgPct >= 0 ? '+' : ''}${fmt(d.chgPct)}`}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-8 text-center font-sans text-ink-soft">
                  No trading days match "{q}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
