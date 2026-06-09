# Website Content Crawler & Text Extractor

**Crawl any website and extract clean, structured content** — page title, meta description, main text, headings and links — at scale. A fast, no-nonsense **web scraper** built on Cheerio (no browser overhead) for SEO research, competitor analysis, content monitoring, and feeding **AI / RAG / LLM** pipelines.

## What this website scraper does

Give it one or more URLs and it returns clean data for every page:

- **Title** and **meta description** (great for SEO audits)
- First **H1** heading
- **Full visible text** (scripts, styles, nav and footer stripped out)
- All outbound **links** on the page
- Optional **same-domain crawling** to follow links automatically

No login, no API key. Optional Apify Proxy for sites that block datacenter IPs.

## Use cases

- **Competitor research** — scrape a competitor's site copy, landing pages and blog
- **SEO audits** — pull titles, meta descriptions and headings across many URLs
- **AI / RAG ingestion** — turn websites into clean text for embeddings and LLMs
- **Content monitoring** — detect copy or pricing changes over time
- **Lead research** — extract company descriptions and contact pages at scale

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `startUrls` | array | — | List of URLs to crawl |
| `maxPages` | integer | `10` | Maximum pages to crawl in total |
| `followLinks` | boolean | `false` | Follow same-domain links up to `maxPages` |
| `maxTextLength` | integer | `20000` | Truncate page text to this many characters |
| `useProxy` | boolean | `false` | Route through Apify Proxy to avoid IP blocks |

### Example input

```json
{
  "startUrls": ["https://example.com"],
  "maxPages": 25,
  "followLinks": true
}
```

## Output

```json
{
  "url": "https://example.com/pricing",
  "title": "Pricing — Example",
  "description": "Simple, transparent pricing.",
  "h1": "Plans for every team",
  "textLength": 4213,
  "text": "Plans for every team ...",
  "linkCount": 38,
  "links": ["https://example.com/signup"],
  "crawledAt": "2026-06-05T10:00:00.000Z"
}
```

## FAQ

**Do I need an API key?** No. It works out of the box.

**Can it crawl JavaScript-heavy sites?** It extracts server-rendered HTML. For content that only appears after heavy client-side rendering, enable `useProxy` and target the API or rendered URLs.

**Will it get blocked?** Most sites are fine. For strict sites, enable `useProxy` to route through Apify Proxy.

**How do I crawl a whole site?** Set `followLinks: true` and raise `maxPages`.
