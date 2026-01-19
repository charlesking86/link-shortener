export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const slug = url.pathname.slice(1);

            // 1. Root Domain Redirect -> Dashboard
            if (!slug || slug === '' || slug === 'favicon.ico') {
                return Response.redirect('https://link-shortener-evu.pages.dev', 301);
            }

            // 2. Lookup Slug in Database
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/links?slug=eq.${slug}&select=id,original`;

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

            if (data && data.length > 0 && data[0].original) {
                const linkData = data[0];

                // 3. FIRE AND FORGET - Analytics Tracking per click
                // We pass the entire request object to extract IP, User Agent, Country, etc.
                ctx.waitUntil(trackClickDetails(env, linkData.id, request));

                return Response.redirect(linkData.original, 301);
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
async function trackClickDetails(env, linkId, request) {
    try {
        // Cloudflare exposes Geo and User properties on the request
        const country = request.cf?.country || 'Unknown';
        const city = request.cf?.city || 'Unknown';
        const region = request.cf?.region || 'Unknown';
        const userAgent = request.headers.get('User-Agent') || 'Unknown';
        const referrer = request.headers.get('Referer') || '';
        const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';

        // Parse basic UA info (simple heuristic)
        let device = 'desktop';
        if (userAgent.toLowerCase().includes('mobile')) device = 'mobile';

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

        // Insert into 'click_events' table
        const rpcUrl = `${env.SUPABASE_URL}/rest/v1/click_events`;
        await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal' // Don't need the response back, just save it
            },
            body: JSON.stringify(analyticsPayload)
        });

        // Also update the simple counter (legacy support)
        const counterUrl = `${env.SUPABASE_URL}/rest/v1/rpc/increment_clicks`;
        await fetch(counterUrl, {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ slug_input: request.url.split('/').pop() })
        });

    } catch (err) {
        console.error("Tracking Error:", err);
    }
}
