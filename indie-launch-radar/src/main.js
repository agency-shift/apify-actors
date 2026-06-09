import { Actor, log } from 'apify';

/**
 * Indie Launch Radar — Show HN Early-Traction Scanner
 *
 * Encodes the Scout's organic-traction discovery logic as an Apify Actor.
 * Source: Hacker News Algolia API (public, no auth, no proxy).
 *
 * Traction score rewards velocity (points per hour) and genuine discussion
 * (comment-to-point ratio) — the organic signals the Scout cares about,
 * not raw vote counts that can be gamed.
 */

const ALGOLIA = 'https://hn.algolia.com/api/v1/search_by_date';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    daysBack = 7,
    minPoints = 20,
    minComments = 3,
    keywords = [],
    maxResults = 100,
} = input;

const sinceTs = Math.floor(Date.now() / 1000) - daysBack * 86400;
const kw = keywords.filter(Boolean).map((k) => k.toLowerCase());

/** Fetch all Show HN posts since `sinceTs`, paging through Algolia. */
async function fetchShowHN() {
    const hits = [];
    let page = 0;
    const hitsPerPage = 100;
    // Algolia caps at 1000 results per query; daysBack<=30 keeps us well under.
    while (page < 10) {
        const url = `${ALGOLIA}?tags=show_hn&numericFilters=created_at_i>${sinceTs}`
            + `&hitsPerPage=${hitsPerPage}&page=${page}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Algolia HTTP ${res.status}`);
        const data = await res.json();
        hits.push(...data.hits);
        if (page >= data.nbPages - 1 || data.hits.length === 0) break;
        page += 1;
    }
    return hits;
}

/**
 * Traction score 0–10. Combines:
 *  - velocity: points per hour (capped), the strongest early signal
 *  - discussion: comments per point (capped), real engagement vs vote burst
 *  - volume: log-scaled point floor so tiny posts can't top the list
 */
function tractionScore({ points, num_comments: comments, ageHours }) {
    const velocity = Math.min(points / Math.max(ageHours, 1), 10) / 10; // 0–1
    const discussion = Math.min(comments / Math.max(points, 1), 0.5) / 0.5; // 0–1
    const volume = Math.min(Math.log10(points + 1) / 3, 1); // 0–1 (~1000 pts = max)
    const score = velocity * 4 + discussion * 3 + volume * 3; // weighted to 10
    return Math.round(score * 10) / 10;
}

const raw = await fetchShowHN();
log.info(`Fetched ${raw.length} Show HN posts from the last ${daysBack} day(s).`);

const nowMs = Date.now();
const launches = raw
    .map((h) => {
        const points = h.points ?? 0;
        const comments = h.num_comments ?? 0;
        const ageHours = Math.max((nowMs - h.created_at_i * 1000) / 3.6e6, 0.5);
        return {
            title: (h.title || '').replace(/^Show HN:\s*/i, '').trim(),
            url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
            points,
            numComments: comments,
            ageHours: Math.round(ageHours * 10) / 10,
            tractionScore: tractionScore({ points, num_comments: comments, ageHours }),
            author: h.author,
            hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
            createdAt: h.created_at,
        };
    })
    .filter((l) => l.points >= minPoints && l.numComments >= minComments)
    .filter((l) => kw.length === 0 || kw.some((k) => l.title.toLowerCase().includes(k)))
    .sort((a, b) => b.tractionScore - a.tractionScore)
    .slice(0, maxResults);

await Actor.pushData(launches);

await Actor.setValue('SUMMARY', {
    scanned: raw.length,
    kept: launches.length,
    daysBack,
    filters: { minPoints, minComments, keywords: kw },
    topLaunch: launches[0] ?? null,
});

log.info(`Done. ${launches.length} launches passed the traction filter.`);
await Actor.exit();
