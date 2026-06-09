import { Actor, log } from 'apify';

/**
 * App Store Localization Gaps — Geo-Arbitrage Finder
 *
 * Finds strong US App Store apps that lack a target localization (DE/FR/ES/IT)
 * and surfaces country reviews requesting translation. Pure public iTunes APIs:
 *   - Search:  https://itunes.apple.com/search
 *   - Lookup:  https://itunes.apple.com/lookup
 *   - Reviews: https://itunes.apple.com/{country}/rss/customerreviews
 * No proxy, no auth, no anti-bot.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    mode = 'search',
    searchTerm = '',
    country = 'us',
    maxResults = 50,
    appIds = [],
    checkLanguage = '',
    includeReviews = false,
    reviewCountry = '',
    reviewPages = 3,
    filterKeywords = [],
} = input;

const lang = (checkLanguage || '').toLowerCase();
const kw = filterKeywords.filter(Boolean).map((k) => k.toLowerCase());
// Where to read reviews from: explicit override, else the market of the target language.
const LANG_MARKET = { de: 'de', fr: 'fr', es: 'es', it: 'it', nl: 'nl', pl: 'pl', pt: 'pt', ja: 'jp' };
const revCountry = (reviewCountry || LANG_MARKET[lang] || country).toLowerCase();

async function getJson(url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AppStoreGaps/1.0)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

/** Normalize an iTunes app record into our shape + flag the language gap. */
function shapeApp(a) {
    const langs = (a.languageCodesISO2A || []).map((l) => l.toLowerCase());
    return {
        appId: String(a.trackId),
        name: a.trackName,
        seller: a.sellerName,
        url: a.trackViewUrl,
        primaryGenre: a.primaryGenreName,
        price: a.price,
        rating: a.averageUserRating,
        ratingCount: a.userRatingCount,
        currentVersionRating: a.averageUserRatingForCurrentVersion,
        languages: langs,
        missingLanguage: lang ? !langs.includes(lang) : null,
        checkedLanguage: lang || null,
        released: a.releaseDate,
        lastUpdated: a.currentVersionReleaseDate,
    };
}

/** Pull up to `reviewPages` of RSS reviews for an app from `revCountry`. */
async function getReviews(appId) {
    const out = [];
    for (let page = 1; page <= Math.min(reviewPages, 10); page += 1) {
        const url = `https://itunes.apple.com/${revCountry}/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/json`;
        let data;
        try {
            data = await getJson(url);
        } catch {
            break;
        }
        const entries = data?.feed?.entry;
        if (!entries || !Array.isArray(entries)) break;
        // First entry on page 1 is app metadata, not a review — skip non-review entries.
        for (const e of entries) {
            if (!e['im:rating']) continue;
            const review = {
                appId: String(appId),
                country: revCountry,
                title: e.title?.label,
                text: e.content?.label,
                rating: Number(e['im:rating']?.label),
                version: e['im:version']?.label,
                author: e.author?.name?.label,
                updated: e.updated?.label,
            };
            const hay = `${review.title || ''} ${review.text || ''}`.toLowerCase();
            if (kw.length === 0 || kw.some((k) => hay.includes(k))) out.push(review);
        }
        if (entries.length < 2) break;
    }
    return out;
}

let pushed = 0;

if (mode === 'search') {
    if (!searchTerm) throw new Error('searchTerm is required in search mode.');
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}`
        + `&country=${country}&entity=software&limit=${Math.min(maxResults, 200)}`;
    const data = await getJson(url);
    log.info(`Found ${data.resultCount} apps for "${searchTerm}" in ${country.toUpperCase()}.`);
    for (const a of data.results) {
        const app = shapeApp(a);
        if (includeReviews) app.matchingReviews = await getReviews(app.appId);
        await Actor.pushData(app);
        pushed += 1;
    }
} else if (mode === 'lookup') {
    if (!appIds.length) throw new Error('appIds is required in lookup mode.');
    const url = `https://itunes.apple.com/lookup?id=${appIds.join(',')}&country=${country}`;
    const data = await getJson(url);
    for (const a of data.results) {
        await Actor.pushData(shapeApp(a));
        pushed += 1;
    }
} else if (mode === 'reviews') {
    if (!appIds.length) throw new Error('appIds is required in reviews mode.');
    for (const id of appIds) {
        const reviews = await getReviews(id);
        log.info(`App ${id}: ${reviews.length} matching reviews from ${revCountry.toUpperCase()}.`);
        for (const r of reviews) {
            await Actor.pushData(r);
            pushed += 1;
        }
    }
}

await Actor.setValue('SUMMARY', { mode, searchTerm, country, checkLanguage: lang, reviewCountry: revCountry, pushed });
log.info(`Done. Pushed ${pushed} items.`);
await Actor.exit();
