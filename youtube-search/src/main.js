import { Actor, log } from 'apify';

/**
 * YouTube Search Scout — extract video metadata from YouTube search results.
 * Parses the `ytInitialData` JSON embedded in the results page. No API key.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { searchQueries = [], maxResults = 30, useProxy = true } = input;
if (!searchQueries.length) throw new Error('searchQueries is required.');

const proxyConfiguration = useProxy ? await Actor.createProxyConfiguration({ groups: ['AUTO'] }) : undefined;

async function gfetch(url) {
    const opts = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            Cookie: 'CONSENT=YES+1; SOCS=CAI',
        },
    };
    if (proxyConfiguration) {
        const { ProxyAgent } = await import('undici');
        opts.dispatcher = new ProxyAgent(await proxyConfiguration.newUrl());
    }
    return fetch(url, opts);
}

function extractInitialData(html) {
    const m = html.match(/var ytInitialData\s*=\s*(\{.+?\});<\/script>/s)
        || html.match(/ytInitialData"\]\s*=\s*(\{.+?\});/s)
        || html.match(/ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch { return null; }
}

/** Walk the search renderer tree and pull videoRenderer nodes. */
function collectVideos(data) {
    const out = [];
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];
    for (const sec of sections) {
        const items = sec?.itemSectionRenderer?.contents || [];
        for (const it of items) {
            const v = it.videoRenderer;
            if (!v) continue;
            out.push({
                videoId: v.videoId,
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
                title: v.title?.runs?.[0]?.text || null,
                channel: v.ownerText?.runs?.[0]?.text || null,
                channelUrl: v.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata
                    ?.webCommandMetadata?.url
                    ? `https://www.youtube.com${v.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`
                    : null,
                viewCountText: v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || null,
                publishedText: v.publishedTimeText?.simpleText || null,
                lengthText: v.lengthText?.simpleText || null,
                description: v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r) => r.text).join('') || null,
            });
        }
    }
    return out;
}

/** "1.2M views" / "12,345 views" -> number */
function parseViews(text) {
    if (!text) return null;
    const m = text.replace(/,/g, '').match(/([\d.]+)\s*([KMB]?)/i);
    if (!m) return null;
    const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
    return Math.round(parseFloat(m[1]) * mult);
}

let total = 0;
for (const q of searchQueries.filter(Boolean)) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    try {
        const res = await gfetch(url);
        const html = await res.text();
        const data = extractInitialData(html);
        if (!data) { log.warning(`No ytInitialData for "${q}" (consent wall?)`); continue; }
        let videos = collectVideos(data);
        videos = videos.slice(0, maxResults).map((v) => ({ ...v, query: q, views: parseViews(v.viewCountText) }));
        for (const v of videos) await Actor.pushData(v);
        total += videos.length;
        log.info(`"${q}": ${videos.length} videos`);
    } catch (e) {
        log.warning(`"${q}" failed: ${e.message}`);
    }
}

log.info(`Done. ${total} videos total.`);
await Actor.exit();
