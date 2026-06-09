import { Actor, log } from 'apify';

/**
 * Meta Ad Library Scout — official Graph API `ads_archive` endpoint.
 * Requires a Meta access token (free from developers.facebook.com).
 * EU countries return ALL ads (DSA transparency); elsewhere only political/issue ads.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    accessToken = '',
    searchTerms = '',
    countries = ['DE'],
    adActiveStatus = 'ACTIVE',
    maxResults = 50,
} = input;

if (!searchTerms) throw new Error('searchTerms is required.');
if (!accessToken) {
    throw new Error(
        'accessToken is required. Meta does not allow Ad Library queries without one. '
        + 'Get a free token at https://developers.facebook.com (create any app, generate a user token).',
    );
}

const FIELDS = [
    'id', 'ad_creation_time', 'ad_delivery_start_time', 'ad_delivery_stop_time',
    'page_id', 'page_name', 'ad_creative_bodies', 'ad_creative_link_titles',
    'ad_creative_link_captions', 'ad_snapshot_url', 'publisher_platforms',
    'impressions', 'spend', 'currency', 'eu_total_reach',
].join(',');

let url = `https://graph.facebook.com/v19.0/ads_archive?`
    + `search_terms=${encodeURIComponent(searchTerms)}`
    + `&ad_reached_countries=${JSON.stringify(countries)}`
    + `&ad_active_status=${adActiveStatus}`
    + `&fields=${FIELDS}&limit=100&access_token=${encodeURIComponent(accessToken)}`;

let pushed = 0;
while (url && pushed < maxResults) {
    const res = await fetch(url);
    const json = await res.json();
    if (json.error) {
        throw new Error(`Meta API error: ${json.error.message} (code ${json.error.code})`);
    }
    for (const ad of json.data || []) {
        await Actor.pushData({
            adId: ad.id,
            pageName: ad.page_name,
            pageId: ad.page_id,
            body: ad.ad_creative_bodies?.[0] || null,
            linkTitle: ad.ad_creative_link_titles?.[0] || null,
            caption: ad.ad_creative_link_captions?.[0] || null,
            platforms: ad.publisher_platforms || null,
            startTime: ad.ad_delivery_start_time,
            stopTime: ad.ad_delivery_stop_time || null,
            euReach: ad.eu_total_reach ?? null,
            impressions: ad.impressions || null,
            spend: ad.spend || null,
            currency: ad.currency || null,
            snapshotUrl: ad.ad_snapshot_url,
            searchTerms,
        });
        pushed += 1;
        if (pushed >= maxResults) break;
    }
    url = json.paging?.next || null;
    log.info(`Fetched page — total so far: ${pushed}`);
}

log.info(`Done. ${pushed} ads.`);
await Actor.exit();
