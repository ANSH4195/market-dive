# Market Dive

Daily high − low range (in index points) for SENSEX and NIFTY 50 over the last 5 years.

Live: https://ansh4195.github.io/market-dive/

## Dev

```sh
pnpm install
pnpm fetch-data   # refresh public/data/*.json from Yahoo Finance
pnpm dev
```

## Data

`scripts/fetch-data.mjs` pulls 5y daily OHLC from Yahoo Finance for each entry in `src/indices.json` and writes `public/data/<id>.json`. Add an index or stock by adding its Yahoo symbol there (e.g. `^NSEBANK`, `RELIANCE.NS`).

## Deploy

`.github/workflows/deploy.yml` fetches fresh data, builds, and publishes `dist/` to the `gh-pages` branch on every push to `main` and every weekday at 17:00 IST. If Yahoo is unreachable from CI, the committed snapshot in `public/data` is used.

In the repo settings, set Pages → Source to the `gh-pages` branch.
