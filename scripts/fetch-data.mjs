// Pulls 5y of daily OHLC from Yahoo Finance for every index in src/indices.json
// and writes public/data/<id>.json. Runs locally and in CI before each build.
// If a fetch fails, the existing file is left in place so the site still builds.
import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('..', import.meta.url)
const indices = JSON.parse(await readFile(new URL('src/indices.json', root), 'utf8'))
const IST_OFFSET_S = 19800

async function fetchIndex({ id, name, yahoo }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=5y&interval=1d`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`${yahoo}: HTTP ${res.status}`)
  const result = (await res.json()).chart?.result?.[0]
  if (!result?.timestamp) throw new Error(`${yahoo}: no data in response`)

  const q = result.indicators.quote[0]
  const byDate = new Map()
  let dropped = 0
  result.timestamp.forEach((t, i) => {
    const [o, h, l, c] = [q.open[i], q.high[i], q.low[i], q.close[i]]
    // Yahoo occasionally returns nulls or a flat high==low bar; both are bad data.
    if ([o, h, l, c].some((v) => v == null) || h <= l) return dropped++
    const date = new Date((t + IST_OFFSET_S) * 1000).toISOString().slice(0, 10)
    byDate.set(date, [date, ...[o, h, l, c].map((v) => Math.round(v * 100) / 100)])
  })
  const rows = [...byDate.values()].sort((a, b) => a[0].localeCompare(b[0]))
  const out = { id, name, yahoo, asof: rows.at(-1)[0], fetchedAt: new Date().toISOString(), rows }
  await writeFile(new URL(`public/data/${id}.json`, root), JSON.stringify(out))
  console.log(`${name}: ${rows.length} days (${rows[0][0]} → ${out.asof}), dropped ${dropped}`)
}

let failed = 0
for (const idx of indices) {
  try {
    await fetchIndex(idx)
  } catch (err) {
    failed++
    console.warn(`WARN keeping existing data for ${idx.name}: ${err.message}`)
  }
}
if (failed === indices.length) console.warn('WARN every fetch failed; site will ship the committed snapshot')
