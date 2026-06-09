# Google Trends Scraper — Demand & Trending Searches

**Scrape Google Trends** to validate demand. Get **interest over time** for any keyword and the **daily trending searches** for any country. Use it to spot **rising niches, seasonal demand and breakout topics** before they peak — for SEO, content, product and market research.

## What this Google Trends scraper does

- **Interest over time** — relative search interest (0–100) for keywords, with an average and a recent-trend percentage
- **Daily trending** — the top trending searches by country, with approximate traffic
- Localized by **geo** (US, DE, FR, GB, BR…)

> Reliability note: the **daily** trending mode is robust. The **interest-over-time** mode depends on Google's heavily rate-limited endpoint — enable `useProxy` (residential) and expect occasional retries.

## Use cases

- **Demand validation** — is interest in a niche rising or fading?
- **Seasonality** — find the best months for a product or campaign
- **Trend spotting** — catch breakout topics from daily trending searches
- **Geo research** — compare demand across countries for geo-expansion
- **Content calendars** — plan around rising search interest

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `mode` | string | `interest` | `interest` (over time) or `daily` (trending) |
| `keywords` | array | — | Keywords to measure (interest mode) |
| `geo` | string | `US` | Country code; empty = worldwide |
| `timeframe` | string | `today 12-m` | e.g. `today 3-m`, `now 7-d` |
| `useProxy` | boolean | `true` | Residential proxy (recommended) |

### Example input

```json
{ "mode": "interest", "keywords": ["ai agents"], "geo": "US", "timeframe": "today 12-m" }
```

## Output

```json
{ "keyword": "ai agents", "geo": "US", "avgInterest": 62.4, "recentTrendPct": 38, "points": [{ "date": "Jun 2025", "value": 41 }] }
```

## FAQ

**Does it need an API key?** No.

**Why use a proxy?** Google Trends blocks datacenter IPs; residential proxy is needed for interest-over-time.

**Which mode is most reliable?** `daily` trending. `interest` works but Google rate-limits it.

**Can I compare countries?** Yes — run per `geo` and compare the results.
