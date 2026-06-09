import { Actor, log } from 'apify';

/**
 * Instagram Scout — public profiles + recent posts.
 * Uses the web_profile_info endpoint with the public web app-id header, which
 * returns public-profile data without login. Instagram rate-limits hard; a
 * residential proxy is recommended. Hashtag scraping requires a logged-in session.
 */

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { usernames = [], maxPosts = 12, useProxy = true, sessionId = '', cookies = '' } = input;

// Prefer the full cookie string; fall back to building one from sessionId.
const cookieHeader = cookies || (sessionId ? `sessionid=${sessionId}` : '');
const csrf = (cookieHeader.match(/csrftoken=([^;]+)/) || [])[1] || '';
if (!usernames.length) throw new Error('usernames is required.');

const proxyConfiguration = useProxy
    ? await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] })
    : undefined;

async function igFetch(username) {
    const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const opts = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'x-ig-app-id': '936619743392459', // public web app id
            'x-asbd-id': '129477',
            'x-requested-with': 'XMLHttpRequest',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: `https://www.instagram.com/${encodeURIComponent(username)}/`,
            // Full cookie + matching csrf token makes the request look like a real browser XHR.
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
            ...(csrf ? { 'x-csrftoken': csrf } : {}),
        },
    };
    if (proxyConfiguration) {
        const { ProxyAgent } = await import('undici');
        opts.dispatcher = new ProxyAgent(await proxyConfiguration.newUrl());
    }
    const res = await fetch(url, opts);
    if (res.status === 404) throw new Error('profile not found');
    if (!res.ok) throw new Error(`HTTP ${res.status} (rate-limited / login wall)`);
    return res.json();
}

let total = 0;
for (const username of usernames.filter(Boolean)) {
    try {
        const json = await igFetch(username);
        const u = json?.data?.user;
        if (!u) throw new Error('no user in response (login wall?)');

        const profile = {
            type: 'profile',
            username: u.username,
            fullName: u.full_name,
            bio: u.biography,
            followers: u.edge_followed_by?.count ?? null,
            following: u.edge_follow?.count ?? null,
            posts: u.edge_owner_to_timeline_media?.count ?? null,
            isVerified: u.is_verified,
            isBusiness: u.is_business_account,
            category: u.category_name || null,
            externalUrl: u.external_url || null,
        };
        await Actor.pushData(profile);
        total += 1;

        const edges = u.edge_owner_to_timeline_media?.edges || [];
        for (const e of edges.slice(0, maxPosts)) {
            const n = e.node;
            await Actor.pushData({
                type: 'post',
                username: u.username,
                shortcode: n.shortcode,
                url: `https://www.instagram.com/p/${n.shortcode}/`,
                caption: n.edge_media_to_caption?.edges?.[0]?.node?.text || null,
                likes: n.edge_liked_by?.count ?? n.edge_media_preview_like?.count ?? null,
                comments: n.edge_media_to_comment?.count ?? null,
                isVideo: n.is_video,
                takenAt: n.taken_at_timestamp ? new Date(n.taken_at_timestamp * 1000).toISOString() : null,
            });
            total += 1;
        }
        log.info(`@${username}: ${profile.followers} followers, ${Math.min(edges.length, maxPosts)} posts`);
    } catch (e) {
        log.warning(`@${username} failed: ${e.message}`);
        await Actor.pushData({ type: 'error', username, error: e.message });
    }
}

log.info(`Done. ${total} items.`);
await Actor.exit();
