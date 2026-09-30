import { useEffect, useRef, useState } from 'react'
import { type Day, fmt } from '@/lib/data'

const PAD = { l: 56, r: 10, t: 10, b: 26 }
const INK = '#1b1530'
const MUTED = '#5a5170'
const GRID = '#e4dcf5'
const BAR = '#a998f0'
const BAR_HOT = '#ff7eb0'

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p
  return v
}

export function RangeChart({ days }: { days: Day[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState(-1)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = canvasRef.current!
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !width || !days.length) return
    const H = cv.clientHeight
    const dpr = window.devicePixelRatio || 1
    cv.width = width * dpr
    cv.height = H * dpr
    const g = cv.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, width, H)

    const pw = width - PAD.l - PAD.r
    const ph = H - PAD.t - PAD.b
    const top = niceMax(Math.max(...days.map((d) => d.range)))
    const n = days.length
    const bw = pw / n

    g.font = '500 11px "JetBrains Mono", monospace'
    g.textAlign = 'right'
    g.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const v = (top / 4) * i
      const y = Math.round(PAD.t + ph - (v / top) * ph) + 0.5
      g.strokeStyle = i === 0 ? INK : GRID
      g.lineWidth = i === 0 ? 2 : 1
      g.beginPath()
      g.moveTo(PAD.l, y)
      g.lineTo(width - PAD.r, y)
      g.stroke()
      g.fillStyle = MUTED
      g.fillText(v.toLocaleString('en-IN'), PAD.l - 8, y)
    }

    days.forEach((d, i) => {
      const h = (d.range / top) * ph
      const x = PAD.l + i * bw
      g.fillStyle = i === hover ? BAR_HOT : BAR
      g.fillRect(x, PAD.t + ph - h, Math.max(bw - (bw > 4 ? 1.5 : 0), 0.7), h)
      if (i === hover) {
        g.strokeStyle = INK
        g.lineWidth = 1.5
        g.strokeRect(x, PAD.t + ph - h, Math.max(bw, 2), h)
      }
    })

    // x-axis ticks at year (long windows) or month (short windows) boundaries
    const byYear = n > 300
    g.textAlign = 'center'
    g.textBaseline = 'top'
    g.fillStyle = MUTED
    let lastKey: string | null = null
    let lastX = -99
    days.forEach((d, i) => {
      const key = byYear ? d.date.slice(0, 4) : d.date.slice(0, 7)
      if (key === lastKey) return
      const x = PAD.l + i * bw
      if (lastKey !== null && x - lastX > 48) {
        const label = byYear
          ? key
          : new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        g.fillStyle = INK
        g.fillRect(x, PAD.t + ph, 1.5, 5)
        g.fillStyle = MUTED
        g.fillText(label, x, PAD.t + ph + 8)
        lastX = x
      }
      lastKey = key
    })
  }, [days, hover, width])

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - rect.left - PAD.l) / ((rect.width - PAD.l - PAD.r) / days.length))
    setHover(i >= 0 && i < days.length ? i : -1)
  }

  const d = days[hover]
  return (
    <section className="brut bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Daily range · High − Low, in points</h2>
        <span className="min-h-5 font-mono text-xs text-ink-soft">
          {d ? (
            <>
              <b className="text-ink">{d.date}</b> H {fmt(d.high)} · L {fmt(d.low)} ·{' '}
              <b className="rounded bg-pink px-1 text-ink">Δ {fmt(d.range)}</b> ({fmt(d.rangePct)}%)
            </>
          ) : (
            'Hover or tap a bar'
          )}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="block h-64 w-full cursor-crosshair touch-none"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(-1)}
      />
    </section>
  )
}
