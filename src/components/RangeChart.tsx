import { useEffect, useMemo, useRef, useState } from 'react'
import { type Day, fmt, fmtDate } from '@/lib/data'

const H = 220
const PAD = { l: 48, r: 12, t: 12, b: 26 }
const LINE = '#3f86cf'
const FILL = '#9ccbf7'
const GRID = '#e4dcf5'
const INK = '#1b1530'
const MUTED = '#5a5170'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function niceTicks(max: number) {
  const p = 10 ** Math.floor(Math.log10(max))
  const top = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((v) => v >= max) ?? max
  return { top, ticks: [0, 1, 2, 3, 4].map((i) => (top / 4) * i) }
}

/** X-axis labels at year, month or day boundaries depending on how much time the data spans */
function xLabels(days: Day[]) {
  const spanDays = (Date.parse(days.at(-1)!.date) - Date.parse(days[0].date)) / 864e5
  const unit = spanDays > 400 ? 'year' : spanDays > 45 ? 'month' : 'day'
  const out: { i: number; text: string }[] = []
  let prev = ''
  days.forEach((d, i) => {
    const key = unit === 'year' ? d.date.slice(0, 4) : unit === 'month' ? d.date.slice(0, 7) : d.date
    if (key === prev) return
    prev = key
    const [y, m, dd] = d.date.split('-')
    out.push({ i, text: unit === 'year' ? y : unit === 'month' ? `${MONTHS[+m - 1]} ${y.slice(2)}` : String(+dd) })
  })
  // The first bucket usually starts mid-period, so drop its label unless it is the only one
  return out.length > 1 ? out.slice(1) : out
}

export function RangeChart({ days }: { days: Day[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(wrapRef.current!)
    return () => ro.disconnect()
  }, [])

  const n = days.length
  const pw = Math.max(width - PAD.l - PAD.r, 1)
  const ph = H - PAD.t - PAD.b
  const { top, ticks } = useMemo(() => niceTicks(Math.max(...days.map((d) => d.range))), [days])
  const x = (i: number) => PAD.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw)
  const y = (v: number) => PAD.t + ph - (v / top) * ph

  const { line, area } = useMemo(() => {
    if (!width) return { line: '', area: '' }
    const pts = days.map((d, i) => `${x(i).toFixed(1)},${y(d.range).toFixed(1)}`)
    const line = `M${pts.join('L')}`
    return { line, area: `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` }
    // x/y are derived from width, days and top
  }, [days, width, top])

  // Keep labels at least ~56px apart so they never collide
  const labels = useMemo(() => {
    let lastX = -Infinity
    return xLabels(days).filter(({ i }) => {
      if (x(i) - lastX < 56) return false
      lastX = x(i)
      return true
    })
  }, [days, width])

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left - PAD.l) / pw
    setHover(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))))
  }

  const h = hover != null ? days[hover] : null
  const hx = hover != null ? x(hover) : 0

  return (
    <div className="bg-white px-3 pt-3 pb-2 sm:px-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-xs">
        <span className="font-sans font-bold">Daily range, points</span>
        <span className="text-ink-soft">
          {n === 1 ? fmtDate(days[0].date) : `${fmtDate(days[0].date)} – ${fmtDate(days[n - 1].date)}`}
        </span>
      </div>
      <div ref={wrapRef} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={H}
            className="block touch-pan-y select-none"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`Daily high minus low for ${n} trading days`}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.l}
                  x2={width - PAD.r}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? INK : GRID}
                  strokeWidth={t === 0 ? 2 : 1}
                />
                <text
                  x={PAD.l - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  fill={MUTED}
                  fontSize={11}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.toLocaleString('en-IN')}
                </text>
              </g>
            ))}
            {labels.map(({ i, text }) => (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                fill={MUTED}
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
              >
                {text}
              </text>
            ))}
            {n > 1 && (
              <>
                <path d={area} fill={FILL} fillOpacity={0.45} />
                <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}
            {n === 1 && <circle cx={x(0)} cy={y(days[0].range)} r={5} fill={LINE} stroke="#fff" strokeWidth={2} />}
            {h && (
              <>
                <line x1={hx} x2={hx} y1={PAD.t} y2={y(0)} stroke={INK} strokeWidth={1} strokeDasharray="3 3" />
                <circle cx={hx} cy={y(h.range)} r={5} fill={LINE} stroke="#fff" strokeWidth={2} />
              </>
            )}
          </svg>
        )}
        {h && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg whitespace-nowrap border-2 border-ink bg-white px-2.5 py-1.5 font-mono text-xs shadow-brut-sm"
            style={hx > width / 2 ? { right: width - hx + 10 } : { left: hx + 10 }}
          >
            <div className="font-sans font-bold">{fmtDate(h.date)}</div>
            <div>
              Δ <b>{fmt(h.range)}</b> <span className="text-ink-soft">({fmt(h.rangePct)}%)</span>
            </div>
            <div className="text-ink-soft">H {fmt(h.high)}</div>
            <div className="text-ink-soft">L {fmt(h.low)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
