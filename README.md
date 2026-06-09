# Agency Shift — Apify Actors

Source code for the public web-scraping **Actors** published on the [Apify Store](https://apify.com/agency-shift) by **Agency Shift**.

Each folder is a standalone Apify Actor (input schema in `.actor/`, code in `src/main.js`).

## Live actors

| Folder | Actor | What it does |
|---|---|---|
| `appstore-gaps` | App Store Localization Gaps | Find US apps missing DE/FR/ES localization (iTunes APIs) |
| `keyword-ideas` | Keyword Ideas Scout | Expand seeds into Google Autocomplete keyword ideas |
| `google-trends` | Google Trends Scout | Interest over time + daily trending searches |
| `youtube-search` | YouTube Search Scout | Scrape YouTube search results (no API key) |
| `serp-search` | SERP Search Scout | Google/DuckDuckGo organic results + rank |
| `web-crawler` | Web Content Crawler | Extract clean text/links from any site |
| `indie-launch-radar` | Indie Launch Radar | Show HN launches ranked by organic traction |
| `fb-ad-library` | Meta Ad Library Scout | Query the Meta Ad Library (needs Meta token) |

## Local dev

```bash
cd <actor-folder>
npm install
apify run        # needs apify-cli + APIFY_TOKEN
```

Deploy with `apify push`.
