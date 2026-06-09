# Keyword Research Scraper — Google Autocomplete Ideas

**Expand any seed keyword into hundreds of real keyword ideas** using Google Autocomplete (the suggestions Google shows as you type). A fast, free **keyword research tool** for **SEO, content marketing and PPC** — find long-tail keywords, questions and buyer-intent phrases real people search for.

## What this keyword scraper does

- Takes one or more **seed keywords**
- Expands each with **A–Z modifiers, question words and prepositions**
- Returns **hundreds of unique, real Google Autocomplete suggestions**
- Localized by **language and country**

> Note: this returns keyword **ideas** (real queries people type), not absolute monthly search volume. Pair it with a volume tool for full keyword research.

## Use cases

- **SEO content planning** — find long-tail keywords and topic clusters
- **PPC / Google Ads** — discover buyer-intent phrases and negatives
- **Question research** — surface "how / what / best / vs" queries for FAQ content
- **Niche validation** — see how a market expands across countries (uk, dubai, canada…)
- **Content briefs** — feed suggestions into your writing and AI workflows

## Input

| Field | Type | Default | Description |
|---|---|---|---|
| `seeds` | array | — | Seed keywords to expand |
| `language` | string | `en` | Autocomplete language (en, de, fr, es, pt) |
| `country` | string | `us` | Country for localized suggestions |
| `expansions` | array | `["alphabet","questions"]` | Modifier sets: `alphabet`, `questions`, `prepositions` |

### Example input

```json
{
  "seeds": ["invoicing app"],
  "language": "en",
  "country": "us",
  "expansions": ["alphabet", "questions"]
}
```

## Output

```json
{ "seed": "invoicing app", "keyword": "invoicing app for freelancers", "source": "invoicing app f", "language": "en", "country": "us" }
```

One seed typically yields **200+ unique keyword ideas**.

## FAQ

**Is it free / no API key?** Yes — it uses Google's public Autocomplete endpoint.

**Does it return search volume?** No — it returns keyword ideas (real suggested queries). Use a dedicated volume tool for numbers.

**Can I research other languages?** Yes — set `language` and `country` (e.g. `de` / `de`).

**How many keywords per seed?** Usually 150–300 depending on the niche and expansion sets.
