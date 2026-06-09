import { Actor, log } from 'apify';
import * as cheerio from 'cheerio';

/**
 * SERP Search Scout — organic results from DuckDuckGo (reliable) or Google (proxy).
 * DuckDuckGo HTML endpoint is far more scrape-friendly than Google; it's the default.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { queries = [], engine = 'duckduckgo', maxResults = 20, region = 'us-en', useProxy = false } = input;
if (!queries.length) throw new Error('queries is required.');

const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] })
    : undefined;

async function gfetch(url, extraHeaders = {}) {
    const opts = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            ...extraHeaders,
        },
    };
    if (proxyConfiguration) {
        const { ProxyAgent } = await import('undici');
        opts.dispatcher = new ProxyAgent(await proxyConfiguration.newUrl());
    }
    return fetch(url, opts);
}

function parseDuckDuckGo(html) {
    const $ = cheerio.load(html);
    const out = [];
    const seen = new Set();
    $('.result__body').each((i, el) => {
        const a = $(el).find('a.result__a').first();
        let href = a.attr('href') || '';
        // DDG wraps links: //duckduckgo.com/l/?uddg=<encoded>
        const m = href.match(/uddg=([^&]+)/);
        if (m) href = decodeURIComponent(m[1]);
        const title = a.text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        if (title && href && !seen.has(href)) {
            seen.add(href);
            out.push({ position: out.length + 1, title, url: href, snippet });
        }
    });
    return out;
}

function parseGoogle(html) {
    const $ = cheerio.load(html);
    const out = [];
    $('div.g, div.tF2Cxc').each((i, el) => {
        const a = $(el).find('a').first();
        const href = a.attr('href') || '';
        const title = $(el).find('h3').first().text().trim();
        const snippet = $(el).find('.VwiC3b, .IsZvec').text().trim();
        if (title && href.startsWith('http')) out.push({ position: out.length + 1, title, url: href, snippet });
    });
    return out;
}

let total = 0;
for (const q of queries.filter(Boolean)) {
    try {
        let results = [];
        if (engine === 'google') {
            const gl = (region.split('-')[1] || region || 'us');
            const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=${maxResults}&hl=en&gl=${gl}`;
            const html = await (await gfetch(url, { Cookie: 'CONSENT=YES+' })).text();
            results = parseGoogle(html);
            if (!results.length) log.warning(`Google returned 0 for "${q}" (likely blocked — needs residential proxy).`);
        } else {
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=${region}`;
            const html = await (await gfetch(url)).text();
            results = parseDuckDuckGo(html);
        }
        results = results.slice(0, maxResults).map((r) => ({ ...r, query: q, engine }));
        for (const r of results) await Actor.pushData(r);
        total += results.length;
        log.info(`"${q}" [${engine}]: ${results.length} results`);
    } catch (e) {
        log.warning(`"${q}" failed: ${e.message}`);
    }
}

log.info(`Done. ${total} results.`);
await Actor.exit();
