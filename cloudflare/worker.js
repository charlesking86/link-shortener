export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const slug = url.pathname.slice(1);

            // 1. Root Domain Redirect -> Dashboard
            if (!slug || slug === '' || slug === 'favicon.ico') {
                return Response.redirect('https://link-shortener-evu.pages.dev', 301);
            }

            // 2. Lookup Slug in Database (Fetching extra columns now: android_url, ios_url)
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/links?slug=eq.${slug}&select=id,original,android_url,ios_url`;

            const response = await fetch(supabaseUrl, {
                headers: {
                    'apikey': env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error(`DB Error ${response.status}: ${await response.text()}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const linkData = data[0];
                let targetUrl = linkData.original;

                // --- SMART REDIRECT LOGIC ---
                const userAgent = request.headers.get('User-Agent') || '';
                const isAndroid = /Android/i.test(userAgent);
                const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

                if (isAndroid && linkData.android_url) {
                    targetUrl = linkData.android_url;
                } else if (isIOS && linkData.ios_url) {
                    targetUrl = linkData.ios_url;
                }
                // -----------------------------

                // 3. Analytics Tracking (Fire and Forget)
                ctx.waitUntil(trackClickDetails(env, linkData.id, request, targetUrl));

                return Response.redirect(targetUrl, 301);
            }

            return new Response(`Link not found: ${slug}`, { status: 404 });

        } catch (e) {
            return new Response(`Worker Error: ${e.message}`, { status: 500 });
        }
    }
};

/**
 * Captures detailed analytics for every click
 */
async function trackClickDetails(env, linkId, request, finalUrl) {
    try {
        const country = request.cf?.country || 'Unknown';
        const city = request.cf?.city || 'Unknown';
        const region = request.cf?.region || 'Unknown';
        const userAgent = request.headers.get('User-Agent') || 'Unknown';
        const referrer = request.headers.get('Referer') || '';
        const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';

        let device = 'desktop';
        if (/mobile/i.test(userAgent)) device = 'mobile';
        if (/tablet/i.test(userAgent)) device = 'tablet';

        const analyticsPayload = {
            link_id: linkId,
            country: country,
            city: city,
            region: region,
            user_agent: userAgent,
            device: device,
            referrer: referrer,
            ip: ip
        };

        const rpcUrl = `${env.SUPABASE_URL}/rest/v1/click_events`;
        await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(analyticsPayload)
        });

        // Legacy Counter Update
        const counterUrl = `${env.SUPABASE_URL}/rest/v1/rpc/increment_clicks`;
        const slug = request.url.split('/').pop();
        await fetch(counterUrl, {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ slug_input: slug })
        });

    } catch (err) {
        console.error("Tracking Error:", err);
    }
}
