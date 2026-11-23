# API reference

Base URL in development: `http://localhost:4000/api`

All requests and responses are JSON unless stated. Errors use a single shape:

```json
{ "error": "Pumps: power factor must be between 0 and 1" }
```

`400` = bad input (the engine's validation message is passed through), `404` = unknown route or project, `500` = unexpected failure.

---

## GET /api

Directory of the API. This is what you see if you open `/api` in a browser.

```json
{
  "name": "Voltwise API",
  "docs": "/api/health",
  "endpoints": ["GET  /api/health", "POST /api/estimate", "…"],
  "ui": "Build the web app (npm run build) to serve it from this same port at /"
}
```

## GET /health

```json
{
  "status": "ok",
  "uptimeSeconds": 128,
  "store": "file",
  "version": "1.0.0"
}
```

`store` is `mongodb` when `MONGO_URI` is connected, otherwise `file` (the JSON store in `DATA_DIR`).

## GET /reference

```json
{
  "cableTable": [
    { "sizeSqmm": 2.5, "ampacity": 30, "r": 9.45, "x": 0.11 },
    { "sizeSqmm": 4, "ampacity": 40, "r": 5.88, "x": 0.107 }
  ],
  "transformerRatings": [25, 63, 100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500],
  "defaultSettings": {
    "voltage": 415, "phases": 3, "diversityFactor": 1, "derating": 1,
    "maxVdPct": 3, "cableLengthM": 50, "maxRuns": 4,
    "maxLoading": 0.8, "futureMargin": 0.2
  },
  "disclaimer": "Cable data is indicative ..."
}
```

`r` is AC resistance in Ω/km at 90 °C, `x` is reactance in Ω/km.

## POST /estimate

Stateless calculation — nothing is stored.

```json
{
  "loads": [
    { "name": "Borewell pumps", "quantity": 4, "ratedKw": 7.5, "powerFactor": 0.82, "demandFactor": 0.75, "phases": 3 },
    { "name": "Lighting", "quantity": 1, "ratedKw": 12, "powerFactor": 0.95, "demandFactor": 0.9, "phases": 1 }
  ],
  "settings": {
    "voltage": 415,
    "phases": 3,
    "diversityFactor": 1.15,
    "derating": 0.9,
    "maxVdPct": 3,
    "cableLengthM": 60,
    "maxRuns": 4,
    "maxLoading": 0.8,
    "futureMargin": 0.2
  }
}
```

Response:

```json
{
  "summary": {
    "connectedKw": 134,
    "demandKw": 87.7,
    "demandKvar": 53.78,
    "demandKva": 102.88,
    "overallPf": 0.852,
    "maxDemandKva": 89.46
  },
  "feeder": { "current": 124.5, "voltage": 415, "phases": 3 },
  "cable": {
    "sizeSqmm": 35,
    "runs": 1,
    "deratedCapacityA": 132.3,
    "voltageDropPct": 1.91,
    "limitedBy": "current",
    "lengthM": 60
  },
  "transformer": { "kva": 160, "requiredKva": 134.2, "loadingPct": 55.9 },
  "breakdown": [
    {
      "name": "Borewell pumps",
      "quantity": 4,
      "ratedKw": 7.5,
      "powerFactor": 0.82,
      "demandFactor": 0.75,
      "phases": 3,
      "connectedKw": 30,
      "demandKw": 22.5,
      "demandKvar": 15.71,
      "shareOfDemandPct": 25.7
    }
  ],
  "settings": { "…": "the settings actually used (defaults merged in)" },
  "warnings": [],
  "meta": { "engine": "voltwise-engine@1.0.0", "generatedAt": "2026-11-19T03:40:00.000Z", "loadCount": 2 }
}
```

`cable` and `transformer` are `null` when the schedule is empty. `limitedBy` is `current` or `voltage drop`. `warnings` flags voltage drop within 10 % of the limit and an overall power factor below 0.85.

### Validation rules

| Field | Rule |
| --- | --- |
| `quantity` | integer ≥ 1 |
| `ratedKw` | > 0 |
| `powerFactor` | 0 < pf ≤ 1 |
| `demandFactor` | 0 < df ≤ 1 |
| `phases` | 1 or 3 |
| `voltage` | 100 – 11000 |
| `diversityFactor` | 1 – 5 |
| `derating` | 0.1 – 1 |
| `maxVdPct` | 0.5 – 10 |
| `cableLengthM` | 1 – 5000 |
| `maxRuns` | 1 – 8 |
| `maxLoading` | 0.2 – 1 |
| `futureMargin` | 0 – 1 |
| `loads` | at most 200 rows |

## POST /import/csv

Two accepted bodies.

`content-type: text/csv`:

```
name,quantity,rated_kw,power_factor,demand_factor,phases
Borewell pumps,4,7.5,0.82,0.75,3
```

`content-type: application/json`:

```json
{ "csv": "name,quantity,rated_kw,power_factor,demand_factor,phases\nPumps,2,7.5,0.82,0.75,3" }
```

Both return:

```json
{
  "loads": [{ "name": "Borewell pumps", "quantity": 4, "ratedKw": 7.5, "powerFactor": 0.82, "demandFactor": 0.75, "phases": 3 }],
  "count": 1,
  "csv": "name,quantity,rated_kw,power_factor,demand_factor,phases\n..."
}
```

Column names are matched case-insensitively and accept `rated_kw`/`ratedKw`, `power_factor`/`pf`, `demand_factor`/`df`, `qty`/`quantity`, `phase`/`phases`. Only `name`, `quantity` and `rated_kw` are mandatory; the rest default to 0.85, 1.0 and 3.

## GET /import/template

Returns `text/csv` with a two-row example.

## Projects

A project document:

```json
{
  "id": "3f1c…",
  "name": "Sample apartment block",
  "client": "Demo",
  "site": "Bengaluru",
  "notes": "",
  "loads": [ … ],
  "settings": { … },
  "lastReport": { … full estimate report … },
  "createdAt": "2026-11-19T03:40:00.000Z",
  "updatedAt": "2026-11-19T03:40:00.000Z"
}
```

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/projects?limit=50` | — | `{ projects: [...], count: n }`, newest first, `limit` capped at 200 |
| POST | `/projects` | `{ name, client?, site?, notes?, loads?, settings? }` | `201`, computes and stores `lastReport` |
| GET | `/projects/:id` | — | `404` if missing |
| PUT | `/projects/:id` | any subset | `settings` are merged with the stored ones; `lastReport` recomputed |
| DELETE | `/projects/:id` | — | `204`, no body |
| POST | `/projects/:id/estimate` | `{ loads?, settings? }` | Recomputes, saves, returns the report |

`POST /projects` requires `name`. Everything else is optional; an empty schedule is allowed (the report comes back with zeroes and `null` cable/transformer).

## Serving the UI

When `web/dist/index.html` exists (after `npm run build`, or when `WEB_DIST` is
set), the same server also serves the React app: `/` returns the SPA and every
non-`/api` path falls back to `index.html`. Without a build, `/` returns a JSON
note explaining how to get the UI. The Docker image builds the app into nginx
instead and proxies `/api` to this server.

## Client notes

- The React app calls these endpoints through the Vite dev proxy, so no CORS setup is needed in development. In production, set `CORS_ORIGIN` to the web origin (comma-separated list allowed).
- The Flutter app defaults to `http://10.0.2.2:4000` (Android emulator → host machine). Use `http://localhost:4000` on the iOS simulator or desktop, and the machine's LAN IP on a real device.
