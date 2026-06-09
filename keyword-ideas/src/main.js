import { Actor, log } from 'apify';

/**
 * Keyword Ideas Scout — expand seeds via Google Autocomplete (suggest API).
 * Free + reliable. Returns keyword IDEAS (real user queries), NOT absolute
 * search volume — exact volume requires the Google Ads Keyword Planner API.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { seeds = [], language = 'en', country = 'us', expansions = ['alphabet', 'questions'] } = input;
if (!seeds.length) throw new Error('seeds is required.');

const ALPHA = 'abcdefghijklmnopqrstuvwxyz'.split('');
const QUESTIONS = ['how', 'what', 'why', 'when', 'where', 'which', 'who', 'can', 'is', 'are', 'best', 'vs'];
const PREPS = ['for', 'with', 'without', 'to', 'near', 'like', 'versus', 'and', 'or'];

async function suggest(query) {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox`
        + `&hl=${language}&gl=${country}&q=${encodeURIComponent(query)}`;
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await res.json();
        return Array.isArray(data?.[1]) ? data[1] : [];
    } catch {
        return [];
    }
}

function buildQueries(seed) {
    const qs = [seed];
    if (expansions.includes('alphabet')) ALPHA.forEach((c) => qs.push(`${seed} ${c}`));
    if (expansions.includes('questions')) QUESTIONS.forEach((w) => qs.push(`${w} ${seed}`));
    if (expansions.includes('prepositions')) PREPS.forEach((w) => qs.push(`${seed} ${w}`));
    return qs;
}

let pushed = 0;
for (const seed of seeds.filter(Boolean)) {
    const seen = new Set();
    const queries = buildQueries(seed);
    for (const q of queries) {
        const suggestions = await suggest(q);
        for (const s of suggestions) {
            const key = s.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            await Actor.pushData({ seed, keyword: s, source: q, language, country });
            pushed += 1;
        }
    }
    log.info(`Seed "${seed}": ${seen.size} unique keyword ideas.`);
}

log.info(`Done. ${pushed} keyword ideas. (Note: ideas, not absolute volume.)`);
await Actor.exit();
