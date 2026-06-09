# Google SERP Scraper — Search Results & Rank Tracking

**Scrape search engine results pages (SERP)** from Google and DuckDuckGo. For any query you get the **organic results: title, URL, snippet and rank position**. Use it for **rank tracking, competitor density analysis, keyword research and commercial-intent discovery**.

## What this SERP scraper does

- Runs any list of search queries
- Returns **organic results** with **position, title, URL and snippet**
- **DuckDuckGo** engine by default (reliable, no proxy needed)
- Optional **Google** engine (via residential Apify Proxy)
- Localize results by region/country

## Use cases

- **Rank tracking** — see who ranks for your target keywords
- **Competitor density** — measure how crowded a keyword's first page is
- **SEO research** — collect titles and snippets for content gap analysis
- **Lead & market research** — find the players in any niche or geo
- **Commercial intent** — spot "best X", "X alternative", "X pricing" queries

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `queries` | array | — | Search queries |
| `engine` | string | `duckduckgo` | `duckduckgo` (reliable) or `google` (needs proxy) |
| `maxResults` | integer | `20` | Max results per query |
| `region` | string | `us-en` | Locale, e.g. `us-en`, `de-de`, `fr-fr` |
| `useProxy` | boolean | `false` | Residential proxy (required for Google) |

### Example input

```json
{
  "queries": ["best marketing automation for agencies"],
  "engine": "duckduckgo",
  "maxResults": 20,
  "region": "us-en"
}
```

## Output

```json
{
  "position": 3,
  "title": "15+ Best Marketing Automation Tools for Agencies",
  "url": "https://example.com/blog/best-marketing-automation",
  "snippet": "Compare the top marketing automation platforms...",
  "query": "best marketing automation for agencies",
  "engine": "duckduckgo"
}
```

## FAQ

**Which engine should I use?** DuckDuckGo is reliable with no proxy. Use Google when you specifically need Google's ranking (enable `useProxy`).

**Can I track rankings over time?** Yes — schedule the actor and store positions per query.

**Does it support other countries?** Yes — set `region` (e.g. `de-de`, `fr-fr`).
