import { Actor, log } from 'apify';

/**
 * LinkedIn Post Search Scout — B2B pain/WTP signals.
 *
 * LinkedIn has no public/anonymous API; post search requires an authenticated
 * session. This actor uses YOUR li_at cookie against LinkedIn's internal Voyager
 * GraphQL search endpoint.
 *
 * ⚠️ WARNING: This violates LinkedIn's Terms of Service, may get the account
 * behind the cookie restricted/banned, and processes personal data (GDPR — you
 * are the controller and must have a lawful basis). Use your own account, at your
 * own risk. Provided because it was explicitly requested.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { liAtCookie = '', keywords = '', maxResults = 25, useProxy = true } = input;

if (!keywords) throw new Error('keywords is required.');
if (!liAtCookie) {
    throw new Error(
        'liAtCookie is required. LinkedIn has no anonymous API — post search needs an authenticated session. '
        + 'Paste your own li_at cookie (DevTools > Application > Cookies > linkedin.com > li_at). '
        + 'WARNING: this violates LinkedIn ToS and risks your account.',
    );
}

const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] })
    : undefined;

async function voyager(url) {
    const opts = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'csrf-token': 'ajax:0000000000000000000',
            cookie: `li_at=${liAtCookie}; JSESSIONID="ajax:0000000000000000000"`,
            'x-restli-protocol-version': '2.0.0',
            accept: 'application/vnd.linkedin.normalized+json+2.1',
        },
    };
    if (proxyConfiguration) {
        const { ProxyAgent } = await import('undici');
        opts.dispatcher = new ProxyAgent(await proxyConfiguration.newUrl());
    }
    return fetch(url, opts);
}

const count = Math.min(maxResults, 50);
// Two endpoints, tried in order: legacy blended search (stable-ish), then content GraphQL.
const endpoints = [
    'https://www.linkedin.com/voyager/api/search/blended'
        + `?count=${count}&keywords=${encodeURIComponent(keywords)}`
        + '&origin=GLOBAL_SEARCH_HEADER&q=all&start=0'
        + '&queryContext=List(spellCorrectionEnabled-%3Etrue)',
    'https://www.linkedin.com/voyager/api/graphql'
        + '?queryId=voyagerSearchDashClusters.realtime'
        + `&variables=(query:(keywords:${encodeURIComponent(keywords)},flagshipSearchIntent:SEARCH_SRP),count:${count})`,
];

/** Recursively pull text-bearing nodes (post commentary, headlines, summaries). */
function harvest(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach((o) => harvest(o, out)); return; }
    const t = obj?.commentary?.text?.text || obj?.summary?.text || obj?.headline?.text
        || (typeof obj.text === 'string' ? obj.text : obj?.text?.text);
    if (t && typeof t === 'string' && t.length > 20) {
        out.push({ text: t, urn: obj.entityUrn || obj.trackingUrn || null });
    }
    for (const k of Object.keys(obj)) if (typeof obj[k] === 'object') harvest(obj[k], out);
}

let pushed = 0;
let lastErr = '';
for (const url of endpoints) {
    try {
        const res = await voyager(url);
        if (res.status === 401 || res.status === 403) {
            throw new Error(`Auth rejected (HTTP ${res.status}) — cookie invalid/expired or account challenged.`);
        }
        if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
        const json = await res.json();
        const found = [];
        harvest(json.included || json.data || json, found);
        const seen = new Set();
        for (const f of found) {
            if (seen.has(f.text)) continue;
            seen.add(f.text);
            await Actor.pushData({ keywords, text: f.text, urn: f.urn });
            pushed += 1;
            if (pushed >= maxResults) break;
        }
        if (pushed > 0) break;
        await Actor.setValue('RAW_SAMPLE', JSON.stringify(json).slice(0, 5000));
    } catch (e) {
        lastErr = e.message;
        if (/Auth rejected/.test(e.message)) break;
    }
}
if (pushed === 0) {
    log.warning(`LinkedIn returned 0 posts. Last: ${lastErr}. Voyager schema/queryId drifts often.`);
    await Actor.pushData({ keywords, error: lastErr || 'no text nodes parsed' });
}

log.info(`Done. ${pushed} posts.`);
await Actor.exit();
