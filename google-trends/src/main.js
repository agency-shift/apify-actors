import { Actor, log } from 'apify';

/**
 * Google Trends Scout — interest over time + daily trending.
 * Uses Google Trends' unofficial JSON endpoints. Google blocks datacenter IPs
 * aggressively, so Apify Proxy is recommended (useProxy=true).
 *
 *  interest: explore -> widget token -> multiline (interest over time)
 *  daily:    trendingsearches/daily RSS by geo
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { mode = 'interest', keywords = [], geo = 'US', timeframe = 'today 12-m', useProxy = true } = input;

// Google Trends blocks datacenter IPs — residential is required to get through.
const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] })
    : undefined;
/**
 * Build a sticky session: one residential IP reused across explore+multiline,
 * with a primed Google cookie (NID). Google Trends ties the widget token to the
 * session, so the IP and cookies MUST be consistent across both calls.
 */
async function makeSession(sessionId) {
    let dispatcher;
    if (proxyConfiguration) {
        const { ProxyAgent } = await import('undici');
        // Sticky session keeps the same residential IP for this keyword.
        const pUrl = await proxyConfiguration.newUrl(sessionId);
        dispatcher = new ProxyAgent(pUrl);
    }
    let cookie = 'CONSENT=YES+';
    const sfetch = (url) => fetch(url, {
        dispatcher,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            Cookie: cookie,
        },
    });
    // Prime: hit the homepage to obtain a real NID cookie before the API calls.
    try {
        const home = await sfetch('https://trends.google.com/trends/?geo=' + (geo || 'US'));
        const setC = home.headers.get('set-cookie');
        if (setC) {
            const nid = setC.match(/NID=[^;]+/);
            if (nid) cookie = `CONSENT=YES+; ${nid[0]}`;
        }
    } catch { /* priming best-effort */ }
    return { fetch: sfetch };
}

async function withRetry(fn, tries = 3) {
    let last;
    for (let i = 0; i < tries; i += 1) {
        try { return await fn(); } catch (e) {
            last = e;
            if (!/429/.test(e.message)) throw e;
            await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
    }
    throw last;
}

function stripGooglePrefix(t) {
    // Google prepends ")]}'," / ")]}'\n" to JSON responses.
    return t.replace(/^\)\]\}'?,?\s*/, '');
}

async function interestOverTime(kw, idx) {
    const session = await makeSession(`kw${idx}`);
    const exploreReq = {
        comparisonItem: [{ keyword: kw, geo: geo || '', time: timeframe }],
        category: 0,
        property: '',
    };
    const exploreUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=0`
        + `&req=${encodeURIComponent(JSON.stringify(exploreReq))}`;
    const exJson = await withRetry(async () => {
        const exRes = await session.fetch(exploreUrl);
        if (!exRes.ok) throw new Error(`explore HTTP ${exRes.status}`);
        return JSON.parse(stripGooglePrefix(await exRes.text()));
    });
    const widget = exJson.widgets.find((w) => w.id === 'TIMESERIES');
    if (!widget) throw new Error('No TIMESERIES widget');

    const dataUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0`
        + `&req=${encodeURIComponent(JSON.stringify(widget.request))}&token=${widget.token}`;
    const dJson = await withRetry(async () => {
        const dRes = await session.fetch(dataUrl);
        if (!dRes.ok) throw new Error(`multiline HTTP ${dRes.status}`);
        return JSON.parse(stripGooglePrefix(await dRes.text()));
    });
    const points = (dJson.default.timelineData || []).map((p) => ({
        date: p.formattedTime,
        value: p.value?.[0] ?? null,
    }));
    const values = points.map((p) => p.value).filter((v) => v != null);
    const avg = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
    const recent = values.slice(-Math.ceil(values.length / 4));
    const recentAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const trend = avg ? Math.round((recentAvg / avg - 1) * 100) : null; // % vs overall avg
    return { keyword: kw, geo, timeframe, avgInterest: avg, recentTrendPct: trend, points };
}

if (mode === 'interest') {
    const kws = keywords.filter(Boolean);
    if (!kws.length) throw new Error('keywords required in interest mode.');
    for (const [idx, kw] of kws.entries()) {
        try {
            const r = await interestOverTime(kw, idx);
            await Actor.pushData(r);
            log.info(`"${kw}" ${geo}: avg ${r.avgInterest}, recent trend ${r.recentTrendPct}%`);
        } catch (e) {
            log.warning(`"${kw}" failed: ${e.message} (Google may have blocked the IP — enable useProxy)`);
            await Actor.pushData({ keyword: kw, geo, error: e.message });
        }
    }
} else {
    const url = `https://trends.google.com/trending/rss?geo=${geo || 'US'}`;
    const session = await makeSession('daily');
    const res = await session.fetch(url);
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    log.info(`Daily trending ${geo}: ${items.length} items.`);
    for (const m of items) {
        const block = m[1];
        const pick = (tag) => (block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [, ''])[1]
            .replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        await Actor.pushData({
            geo,
            title: pick('title'),
            traffic: pick('ht:approx_traffic'),
            pubDate: pick('pubDate'),
        });
    }
}

await Actor.exit();
