import { type Day, fmt, fmtDate, type summarize } from '@/lib/data'

type Summary = ReturnType<typeof summarize>

export function StatCards({ s }: { s: Summary }) {
  const cards: { label: string; value: number; meta?: string; bg: string; day?: Day }[] = [
    { label: 'Latest day', value: s.latest.range, day: s.latest, bg: 'bg-sky' },
    { label: 'Widest day', value: s.widest.range, day: s.widest, bg: 'bg-pink' },
    { label: 'Narrowest day', value: s.narrowest.range, day: s.narrowest, bg: 'bg-mint' },
    { label: 'Median day', value: s.median, meta: `across ${s.count.toLocaleString('en-IN')} days`, bg: 'bg-butter' },
  ]
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className={`brut ${c.bg} flex flex-col gap-1 p-4`}>
          <span className="text-xs font-bold tracking-wider uppercase">{c.label}</span>
          <span className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">{fmt(c.value)}</span>
          <span className="font-mono text-xs text-ink-soft">
            {c.day ? `${fmtDate(c.day.date)} · ${fmt(c.day.rangePct)}%` : c.meta}
          </span>
        </div>
      ))}
    </section>
  )
}
