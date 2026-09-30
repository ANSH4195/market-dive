import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'
import { type Day, fmt } from '@/lib/data'

type Key = keyof Day
// `detail` columns are hidden on phones and shown in the row's expanded panel instead
const COLS: { key: Key; label: string; detail?: true }[] = [
  { key: 'date', label: 'Date' },
  { key: 'open', label: 'Open', detail: true },
  { key: 'high', label: 'High', detail: true },
  { key: 'low', label: 'Low', detail: true },
  { key: 'close', label: 'Close', detail: true },
  { key: 'range', label: 'Range (pts)' },
  { key: 'rangePct', label: 'Range %', detail: true },
  { key: 'chgPct', label: 'Day chg %', detail: true },
]
const DETAIL_COLS = COLS.filter((c) => c.detail)
const MOBILE_COLSPAN = COLS.length - DETAIL_COLS.length + 1 // +1 for the chevron column

const chgClass = (v: number | null) => (v == null ? '' : v >= 0 ? 'text-up' : 'text-down')

function cellText(d: Day, key: Key) {
  if (key === 'date') return d.date
  if (key === 'chgPct') return d.chgPct == null ? '—' : `${d.chgPct >= 0 ? '+' : ''}${fmt(d.chgPct)}`
  return fmt(d[key])
}

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
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const toggle = (date: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(date)) next.add(date)
      return next
    })

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
  // Spacer rows stand in for the off-screen rows so the table keeps its real scroll height.
  // Each virtual item is its own <tbody> so a row and its expanded panel are measured together.
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
                  className={`sticky top-0 z-10 border-b-[2.5px] border-ink bg-butter p-0 ${i ? 'text-right' : 'text-left'} ${
                    c.detail ? 'hidden md:table-cell' : ''
                  }`}
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
              <th className="sticky top-0 z-10 w-10 border-b-[2.5px] border-ink bg-butter md:hidden">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          {padTop > 0 && (
            <tbody aria-hidden>
              <tr>
                <td colSpan={COLS.length + 1} style={{ height: padTop, padding: 0 }} />
              </tr>
            </tbody>
          )}
          {items.map(({ index }) => {
            const d = rows[index]
            const isOpen = open.has(d.date)
            return (
              <tbody
                key={d.date}
                data-index={index}
                ref={virtualizer.measureElement}
                className="border-b border-lavender"
              >
                <tr
                  onClick={() => toggle(d.date)}
                  className={`cursor-pointer hover:bg-lilac md:cursor-auto ${isOpen ? 'max-md:bg-lilac' : ''}`}
                >
                  {COLS.map((c, i) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 whitespace-nowrap md:py-1.5 ${i ? 'text-right' : ''} ${
                        c.detail ? 'hidden md:table-cell' : ''
                      } ${c.key === 'range' ? 'font-bold text-plum' : ''} ${c.key === 'chgPct' ? chgClass(d.chgPct) : ''}`}
                    >
                      {cellText(d, c.key)}
                    </td>
                  ))}
                  <td className="w-10 pr-3 text-right md:hidden">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${d.date}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(d.date)
                      }}
                      className={`inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-2 border-ink font-sans text-xs transition-transform ${
                        isOpen ? 'rotate-180 bg-lavender' : 'bg-white'
                      }`}
                    >
                      ▾
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-lilac md:hidden">
                    <td colSpan={MOBILE_COLSPAN} className="px-3 pt-1 pb-3">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {DETAIL_COLS.map((c) => (
                          <div key={c.key} className="flex flex-col">
                            <dt className="font-sans text-[10px] font-bold tracking-wider text-ink-soft uppercase">
                              {c.label}
                            </dt>
                            <dd className={c.key === 'chgPct' ? chgClass(d.chgPct) : ''}>{cellText(d, c.key)}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
          {padBottom > 0 && (
            <tbody aria-hidden>
              <tr>
                <td colSpan={COLS.length + 1} style={{ height: padBottom, padding: 0 }} />
              </tr>
            </tbody>
          )}
          {!rows.length && (
            <tbody>
              <tr>
                <td colSpan={COLS.length + 1} className="px-3 py-8 text-center font-sans text-ink-soft">
                  No trading days match this date.
                </td>
              </tr>
            </tbody>
          )}
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
