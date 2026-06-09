# YouTube Search Scraper — No API Key

**Scrape YouTube search results** without an API key or login. Enter any search query and get structured video data: **title, channel, view count, length, publish date, description and URL**. Perfect for **market research, demand validation, competitor content analysis** and finding creators in any niche.

## What this YouTube scraper does

- Searches YouTube for any query (or list of queries)
- Extracts **video title, channel name, channel URL, views, length, age and description**
- Parses real **view counts** into numbers so you can sort and filter
- **No YouTube Data API key** and **no quota limits** — it reads `ytInitialData`

## Use cases

- **Demand research** — see how many videos and views a topic gets
- **Competitor analysis** — find who is making content in your niche and how it performs
- **Influencer / creator discovery** — build lists of channels by keyword
- **Content ideas** — surface high-performing titles and angles
- **Trend spotting** — track "I built…", "$X MRR", or any niche phrase

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `searchQueries` | array | — | YouTube search terms |
| `maxResults` | integer | `30` | Max videos per query |
| `useProxy` | boolean | `true` | Route through Apify Proxy to avoid consent walls |

### Example input

```json
{
  "searchQueries": ["ai automation agency", "how I built a saas"],
  "maxResults": 50
}
```

## Output

```json
{
  "videoId": "abc123",
  "url": "https://www.youtube.com/watch?v=abc123",
  "title": "How I Built a SaaS Startup",
  "channel": "Starter Story",
  "views": 876031,
  "publishedText": "1 year ago",
  "lengthText": "18:24",
  "query": "how I built a saas"
}
```

## FAQ

**Do I need a YouTube API key?** No. There are no API quotas to worry about.

**Are view counts accurate?** They are parsed from YouTube's own search page (e.g. "1.2M views" → 1200000).

**Can I scrape multiple keywords at once?** Yes — pass several terms in `searchQueries`.

**Why enable proxy?** YouTube sometimes shows a consent wall; Apify Proxy avoids it.
