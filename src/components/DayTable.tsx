import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Distinct values of date.slice(from, to) among dates starting with prefix, in date order */
const partsOf = (days: Day[], prefix: string, from: number, to: number) => [
  ...new Set(days.filter((d) => d.date.startsWith(prefix)).map((d) => d.date.slice(from, to))),
]

export function DayTable({ days, name }: { days: Day[]; name: string }) {
  const [sortKey, setSortKey] = useState<Key>('date')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  // Date filter narrows in order: year, then month within it, then day within that
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')

  const years = useMemo(() => partsOf(days, '', 0, 4).reverse(), [days])
  const months = useMemo(() => (year ? partsOf(days, `${year}-`, 5, 7) : []), [days, year])
  const dayNums = useMemo(() => (month ? partsOf(days, `${year}-${month}-`, 8, 10) : []), [days, year, month])
  const prefix = [year, month, day].filter(Boolean).join('-')

  const rows = useMemo(() => {
    const filtered = prefix ? days.filter((d) => d.date.startsWith(prefix)) : days
    return [...filtered].sort((a, b) => {
      const x = a[sortKey] ?? -Infinity
      const y = b[sortKey] ?? -Infinity
      const c = x < y ? -1 : x > y ? 1 : 0
      return dir === 'asc' ? c : -c
    })
  }, [days, prefix, sortKey, dir])

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 33,
    overscan: 15,
  })
  const items = virtualizer.getVirtualItems()
  // Spacer rows stand in for the off-screen rows so the table keeps its real scroll height
  const padTop = items[0]?.start ?? 0
  const padBottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1].end : 0

  const sortBy = (k: Key) => {
    setDir(k === sortKey && dir === 'desc' ? 'asc' : 'desc')
    setSortKey(k)
  }

  return (
    <section className="brut overflow-hidden bg-white">
      <div className="flex flex-col items-center gap-3 border-b-[2.5px] border-ink bg-lilac px-4 py-3 text-center lg:flex-row lg:justify-between lg:text-left">
        <h2 className="text-sm font-bold">
          {name} · {rows.length.toLocaleString('en-IN')}
          {prefix && ` of ${days.length.toLocaleString('en-IN')}`} trading days
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <DateSelect
            id="filter-year"
            label="Year"
            value={year}
            options={years.map((y) => [y, y])}
            onChange={(v) => {
              setYear(v)
              setMonth('')
              setDay('')
            }}
          />
          <DateSelect
            id="filter-month"
            label="Month"
            value={month}
            disabled={!year}
            options={months.map((m) => [m, MONTHS[Number(m) - 1]])}
            onChange={(v) => {
              setMonth(v)
              setDay('')
            }}
          />
          <DateSelect
            id="filter-day"
            label="Day"
            value={day}
            disabled={!month}
            options={dayNums.map((d) => [d, String(Number(d))])}
            onChange={setDay}
          />
          {prefix && (
            <button
              type="button"
              onClick={() => {
                setYear('')
                setMonth('')
                setDay('')
              }}
              className="cursor-pointer text-sm font-semibold text-plum underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="max-h-[560px] overflow-auto">
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
            {padTop > 0 && (
              <tr aria-hidden>
                <td colSpan={COLS.length} style={{ height: padTop, padding: 0 }} />
              </tr>
            )}
            {items.map(({ index }) => {
              const d = rows[index]
              return (
                <tr
                  key={d.date}
                  data-index={index}
                  ref={virtualizer.measureElement}
                  className="border-b border-lavender hover:bg-lilac"
                >
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
              )
            })}
            {padBottom > 0 && (
              <tr aria-hidden>
                <td colSpan={COLS.length} style={{ height: padBottom, padding: 0 }} />
              </tr>
            )}
            {!rows.length && (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-8 text-center font-sans text-ink-soft">
                  No trading days match this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DateSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  options: [value: string, text: string][]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded-lg border-[2.5px] border-ink bg-white px-2.5 py-1.5 text-sm font-semibold shadow-brut-sm disabled:cursor-not-allowed disabled:border-ink-soft/40 disabled:text-ink-soft/50 disabled:shadow-none"
    >
      <option value="">{`Any ${label.toLowerCase()}`}</option>
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  )
}
