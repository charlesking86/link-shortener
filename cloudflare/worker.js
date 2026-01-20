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
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/links?slug=eq.${slug}&or=(domain.eq.${hostname},domain.is.null)&select=id,original,android_url,ios_url,password,expires_at`;

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

                // --- SECURITY CHECKS ---

                // A. Check Expiration
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

                // B. Check Password
                if (linkData.password) {
                    let authenticated = false;

                    if (request.method === 'POST') {
                        const formData = await request.formData();
                        const inputPass = formData.get('password');
                        if (inputPass === linkData.password) {
                            authenticated = true;
                        } else {
                            // Incorrect Password - Re-render with error
                            return new Response(getPasswordPage(slug, true), { headers: { 'Content-Type': 'text/html' } });
                        }
                    }

                    if (!authenticated) {
                        return new Response(getPasswordPage(slug, false), { headers: { 'Content-Type': 'text/html' } });
                    }
                }

                // --- SMART REDIRECT LOGIC ---
                let targetUrl = linkData.original;
                const userAgent = request.headers.get('User-Agent') || '';
                const isAndroid = /Android/i.test(userAgent);
                const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

                if (isAndroid && linkData.android_url) {
                    targetUrl = linkData.android_url;
                } else if (isIOS && linkData.ios_url) {
                    targetUrl = linkData.ios_url;
                }

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
