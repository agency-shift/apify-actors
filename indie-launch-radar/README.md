# Indie Launch Radar — Show HN Early-Traction Scanner

Find early-stage SaaS and indie products **gaining real organic traction** on Hacker News — before they hit everyone's radar.

This Actor scans **Show HN** launches and ranks them by a **traction score** that rewards *velocity* (points per hour) and *genuine discussion* (comment-to-point ratio), not just raw vote counts. It's built for indie hackers, scouts, and investors who want signal, not noise.

## What it does

- Pulls Show HN launches from the last *N* days via the public Hacker News (Algolia) API
- Filters out low-signal posts (configurable minimum points & comments)
- Optional keyword filter (e.g. `ai`, `b2b`, `developer tools`)
- Scores each launch 0–10 on organic traction and sorts best-first

No proxy, no login, no API key required.

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `daysBack` | integer | `7` | How many days of launches to scan (1–30) |
| `minPoints` | integer | `20` | Discard launches below this many points |
| `minComments` | integer | `3` | Discard launches below this many comments |
| `keywords` | array | `[]` | Keep only titles matching a keyword (empty = all) |
| `maxResults` | integer | `100` | Cap on launches returned |

### Example input

```json
{
  "daysBack": 7,
  "minPoints": 30,
  "minComments": 5,
  "keywords": ["ai", "saas", "b2b"],
  "maxResults": 50
}
```

## Output

Each item in the dataset:

```json
{
  "title": "MyTool – open-source X for Y",
  "url": "https://mytool.com",
  "points": 142,
  "numComments": 38,
  "ageHours": 19.2,
  "tractionScore": 7.4,
  "author": "janedoe",
  "hnUrl": "https://news.ycombinator.com/item?id=00000000",
  "createdAt": "2026-06-01T10:00:00.000Z"
}
```

A `SUMMARY` record is also saved to the key-value store with scan counts and the top launch.

## How the traction score works

`tractionScore` (0–10) blends three organic signals:

- **Velocity** (40%) — points per hour since posting. The strongest early signal.
- **Discussion** (30%) — comments per point. Real engagement, hard to fake.
- **Volume** (30%) — log-scaled point floor so tiny posts can't top the list.

## Use cases

- Spot indie SaaS launches in their first 24–72h window
- Build a weekly "launch radar" newsletter or dashboard
- Source deals or competitive intel by keyword/category
