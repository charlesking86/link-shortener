export default {
    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const slug = url.pathname.slice(1);

            // 1. Root Domain Redirect -> Dashboard
            if (!slug || slug === '' || slug === 'favicon.ico') {
                return Response.redirect('https://link-shortener-evu.pages.dev', 301);
            }

            // 2. Lookup Slug + Domain in Database
            const hostname = url.hostname;
            // Query with ALL new columns
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/links?slug=eq.${slug}&or=(domain.eq.${hostname},domain.is.null)&select=id,original,android_url,ios_url,password,expires_at,geo_targets,social_tags,http_status`;

            const response = await fetch(supabaseUrl, {
                headers: {
                    'apikey': env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
                }
            });

            if (!response.ok) {
                // Determine if DB error or just 404
                const text = await response.text();
                // If 404/Empty array handled below, but if fetch failed:
                // throw new Error(`DB Error ${response.status}: ${text}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const linkData = data[0];

                // --- 1. EXPIRATION CHECK ---
                if (linkData.expires_at && new Date() > new Date(linkData.expires_at)) {
                    return new Response(`
                        <html>
                        <head><title>Link Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
                        <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f9fafb;">
                            <div style="text-align: center; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                                <h1 style="color: #ef4444; margin-bottom: 0.5rem;">Link Expired</h1>
                                <p style="color: #6b7280;">This link is no longer active.</p>
                            </div>
                        </body>
                        </html>
                    `, { status: 410, headers: { 'Content-Type': 'text/html' } });
                }

                // --- 2. SOCIAL CARDS (BOTS) ---
                const userAgent = request.headers.get('User-Agent') || '';
                const isBot = /facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot/i.test(userAgent);

                if (isBot && linkData.social_tags && (linkData.social_tags.title || linkData.social_tags.image)) {
                    const { title, description, image } = linkData.social_tags;
                    return new Response(`
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta property="og:title" content="${title || ''}" />
                            <meta property="og:description" content="${description || ''}" />
                            <meta property="og:image" content="${image || ''}" />
                            <meta name="twitter:card" content="summary_large_image" />
                            <meta name="twitter:title" content="${title || ''}" />
                            <meta name="twitter:description" content="${description || ''}" />
                            <meta name="twitter:image" content="${image || ''}" />
                            <title>${title || 'Redirecting...'}</title>
                        </head>
                        <body></body>
                        </html>
                    `, { headers: { 'Content-Type': 'text/html' } });
                }

                // --- 3. PASSWORD PROTECTION ---
                if (linkData.password) {
                    let authenticated = false;

                    if (request.method === 'POST') {
                        const formData = await request.formData();
                        const inputPass = formData.get('password');
                        if (inputPass === linkData.password) {
                            authenticated = true;
                        } else {
                            return new Response(getPasswordPage(slug, true), { headers: { 'Content-Type': 'text/html' } });
                        }
                    }

                    if (!authenticated) {
                        return new Response(getPasswordPage(slug, false), { headers: { 'Content-Type': 'text/html' } });
                    }
                }

                // --- 4. TARGETING LOGIC (Start with Original) ---
                let targetUrl = linkData.original;
                const country = request.cf?.country; // e.g. "US"

                // A. Geo-Targeting
                if (country && linkData.geo_targets && Array.isArray(linkData.geo_targets)) {
                    const geoRule = linkData.geo_targets.find(r => r.country === country);
                    if (geoRule && geoRule.url) {
                        targetUrl = geoRule.url;
                    }
                }

                // B. Device Targeting (Overrides Geo if set? OR Geo overrides Device? Let's say Geo > Device usually, but here Mobile App store links might be specific)
                // Let's keep Mobile logic as fallback or priority? 
                // Usually: Check Geo first. If no Geo, check Device.
                // BUT: If I am in US and use iPhone, do I want US Link or iPhone Link?
                // Logic: Detailed targeting. Let's apply Mobile Check *on top* of the targetUrl if needed, but currently Mobile is global.
                // Simplest: Check Mobile Fields. If present, they override 'Original'.
                // If Geo matched, we usually use that URL explicitly.
                // Let's stick to: Geo > Mobile > Default.

                // Wait, if I set a US-Specific URL, I probably want that for US users regardless of device.
                // So if Geo matched, skip Mobile check? Or define Mobile per Geo? (Too complex).
                // Current Logic: If Geo matched, use it. If NOT, check Mobile.

                const geoMatched = (targetUrl !== linkData.original); // Did we change it?

                if (!geoMatched) { // Only check Mobile if we haven't already redirected based on Country
                    const isAndroid = /Android/i.test(userAgent);
                    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

                    if (isAndroid && linkData.android_url) {
                        targetUrl = linkData.android_url;
                    } else if (isIOS && linkData.ios_url) {
                        targetUrl = linkData.ios_url;
                    }
                }

                // 5. Analytics Tracking (Fire and Forget)
                ctx.waitUntil(trackClickDetails(env, linkData.id, request, targetUrl));

                // 6. Final Redirect
                return Response.redirect(targetUrl, linkData.http_status || 301);
            }

            return new Response(`Link not found: ${slug}`, { status: 404 });

        } catch (e) {
            return new Response(`Worker Error: ${e.message}`, { status: 500 });
        }
    }
};

function getPasswordPage(slug, error) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Protected</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); width: 100%; max-width: 400px; }
            h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; text-align: center; color: #111827; }
            p { color: #6b7280; text-align: center; margin-bottom: 1.5rem; font-size: 0.875rem; }
            input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; margin-bottom: 1rem; box-sizing: border-box; font-size: 1rem; }
            button { width: 100%; background-color: #10b981; color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; font-size: 1rem; transition: background-color 0.2s; }
            button:hover { background-color: #059669; }
            .error { color: #ef4444; font-size: 0.875rem; text-align: center; margin-bottom: 1rem; }
        </style>
    </head>
    <body>
        <div class="card">
            <div style="text-align: center; margin-bottom: 1rem;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h1>Password Protected</h1>
            <p>This link is protected. Please enter the password to continue.</p>
            ${error ? '<div class="error">Incorrect password. Please try again.</div>' : ''}
            <form method="POST">
                <input type="password" name="password" placeholder="Enter password" required autofocus>
                <button type="submit">Unlock Link</button>
            </form>
        </div>
    </body>
    </html>
    `
}

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

    } catch (err) {
        console.error("Tracking Error:", err);
    }
}
