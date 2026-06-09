# Pricing — Agency Shift Apify Actors

Model: **Pay-per-event** with a single **"Actor start"** event (= flat price per run).
Set in Apify Console → each Actor → **Publication → Monetization**.

> ⚠️ One-time first: Console → **Settings → Billing/Payouts** → add payout method (PayPal/Stripe) + tax info. Monetization can't be enabled until this is done. You keep **80%** of revenue minus platform costs.

| Actor (slug) | Price / run (Actor start) |
|---|---|
| youtube-search-scout | $0.10 |
| meta-ad-library-scout *(awaiting KYC)* | $0.15 |
| serp-search-scout | $0.05 |
| google-trends-scout | $0.10 |
| keyword-ideas-scout | $0.05 |
| indie-launch-radar-show-hn-early-traction-scanner | $0.10 |
| appstore-localization-gaps | $0.10 |
| web-content-crawler | $0.05 |
| appstore-top-charts | $0.10 |
| apple-podcasts-scraper | $0.05 |
| hackernews-jobs-ask-scraper | $0.05 |
| amazon-autocomplete-keywords | $0.03 |
| npm-pypi-package-tracker | $0.03 |
| company-registry-lei-scraper | $0.10 |
| ats-jobs-scraper | $0.10 |
| sec-edgar-filings-scraper | $0.10 |

## Per-event setup (the wizard asks for this)
- Event name: **Actor start**
- Event description: "Charged once when the run starts."
- Price: the value above
- Primary event: Actor start

## Note (revenue strategy)
Flat per-run is simple + predictable, but a user pulling 1 result pays the same as one pulling 50k.
For the high-volume actors (serp-search, company-registry, ats-jobs, package-tracker) consider
**adding a small per-result event** later (e.g. $0.5–2 / 1,000 results) so revenue scales with usage.
