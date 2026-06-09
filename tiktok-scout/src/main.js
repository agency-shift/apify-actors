import { Actor, log } from 'apify';
import { chromium } from 'playwright';

/**
 * TikTok Scout — hashtag/profile videos via headless browser + residential proxy.
 * Strategy: navigate the page and intercept the item_list XHR responses TikTok
 * fires to load videos (most reliable vs. parsing embedded state). TikTok anti-bot
 * is aggressive — residential proxy is required for any consistency.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { hashtags = [], profiles = [], maxItems = 20, useProxy = true, cookies = '' } = input;
if (!hashtags.length && !profiles.length) throw new Error('Provide at least one hashtag or profile.');

const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] })
    : undefined;

function shapeItem(it, target) {
    const s = it.stats || it.statsV2 || {};
    return {
        target,
        videoId: it.id,
        url: `https://www.tiktok.com/@${it.author?.uniqueId || ''}/video/${it.id}`,
        caption: it.desc,
        author: it.author?.uniqueId,
        authorName: it.author?.nickname,
        plays: Number(s.playCount ?? 0),
        likes: Number(s.diggCount ?? 0),
        comments: Number(s.commentCount ?? 0),
        shares: Number(s.shareCount ?? 0),
        createTime: it.createTime ? new Date(it.createTime * 1000).toISOString() : null,
        music: it.music?.title || null,
    };
}

async function scrapeTarget(browser, url, target) {
    const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        proxy: proxyUrl ? { server: proxyUrl } : undefined,
        locale: 'en-US',
    });
    // Apply a logged-in cookie string if provided (boosts success vs. anonymous).
    if (cookies) {
        const parsed = cookies.split(';').map((c) => {
            const idx = c.indexOf('=');
            return { name: c.slice(0, idx).trim(), value: c.slice(idx + 1).trim(), domain: '.tiktok.com', path: '/' };
        }).filter((c) => c.name && c.value);
        if (parsed.length) await context.addCookies(parsed);
    }
    const page = await context.newPage();
    const collected = [];
    const seen = new Set();

    page.on('response', async (res) => {
        const u = res.url();
        if (!/item_list|search\/general|challenge\/item/.test(u)) return;
        try {
            const json = await res.json();
            for (const it of json.itemList || json.items || []) {
                if (it.id && !seen.has(it.id)) { seen.add(it.id); collected.push(shapeItem(it, target)); }
            }
        } catch { /* not json */ }
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3500);
        // Scroll to trigger lazy item_list loads until we have enough.
        for (let i = 0; i < 8 && collected.length < maxItems; i += 1) {
            await page.mouse.wheel(0, 3000);
            await page.waitForTimeout(2000);
        }
        // Fallback: parse embedded rehydration state if XHR gave nothing.
        if (collected.length === 0) {
            const data = await page.evaluate(() => {
                const el = document.querySelector('#__UNIVERSAL_DATA_FOR_REHYDRATION__');
                return el ? el.textContent : null;
            });
            if (data) {
                try {
                    const j = JSON.parse(data);
                    const scope = j.__DEFAULT_SCOPE__ || {};
                    const items = scope['webapp.user-detail']?.itemList
                        || scope['webapp.challenge-detail']?.itemList || [];
                    for (const it of items) if (it.id && !seen.has(it.id)) { seen.add(it.id); collected.push(shapeItem(it, target)); }
                } catch { /* ignore */ }
            }
        }
    } catch (e) {
        log.warning(`${target}: navigation failed — ${e.message}`);
    } finally {
        await context.close();
    }
    return collected.slice(0, maxItems);
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
let total = 0;
try {
    for (const h of hashtags.filter(Boolean)) {
        const items = await scrapeTarget(browser, `https://www.tiktok.com/tag/${encodeURIComponent(h)}`, `#${h}`);
        for (const it of items) await Actor.pushData(it);
        total += items.length;
        log.info(`#${h}: ${items.length} videos`);
    }
    for (const p of profiles.filter(Boolean)) {
        const items = await scrapeTarget(browser, `https://www.tiktok.com/@${encodeURIComponent(p)}`, `@${p}`);
        for (const it of items) await Actor.pushData(it);
        total += items.length;
        log.info(`@${p}: ${items.length} videos`);
    }
} finally {
    await browser.close();
}

if (total === 0) {
    log.warning('0 videos — TikTok likely served an anti-bot wall. Residential proxy + retries help, but TikTok actively blocks automation.');
}
log.info(`Done. ${total} videos.`);
await Actor.exit();
