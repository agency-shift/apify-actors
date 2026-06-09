import { Actor, log } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee';

/**
 * Web Content Crawler — generic site text extractor.
 * Fast Cheerio (no browser) crawler: title, meta description, clean text and links.
 * Optional same-domain link following and Apify Proxy.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    startUrls = [],
    maxPages = 10,
    followLinks = false,
    maxTextLength = 20000,
    useProxy = false,
} = input;

if (!startUrls.length) throw new Error('startUrls is required.');

const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({ groups: ['AUTO'] })
    : undefined;

const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: maxPages,
    requestHandlerTimeoutSecs: 45,
    async requestHandler({ request, $, enqueueLinks }) {
        // Strip noise before extracting text.
        $('script, style, noscript, svg, nav, footer, header').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, maxTextLength);
        const links = [];
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && /^https?:\/\//.test(href)) links.push(href);
        });

        await Dataset.pushData({
            url: request.url,
            title: $('title').first().text().trim() || null,
            description: $('meta[name="description"]').attr('content')
                || $('meta[property="og:description"]').attr('content') || null,
            h1: $('h1').first().text().trim() || null,
            textLength: text.length,
            text,
            linkCount: links.length,
            links: links.slice(0, 100),
            crawledAt: new Date().toISOString(),
        });
        log.info(`Scraped ${request.url} (${text.length} chars)`);

        if (followLinks) {
            await enqueueLinks({ strategy: 'same-domain' });
        }
    },
    failedRequestHandler({ request }) {
        log.warning(`Failed: ${request.url}`);
    },
});

await crawler.run(startUrls.map((url) => (typeof url === 'string' ? { url } : url)));
log.info('Crawl finished.');
await Actor.exit();
