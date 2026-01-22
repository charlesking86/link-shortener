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
            const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/links?slug=eq.${slug}&or=(domain.eq.${hostname},domain.is.null)&select=id,original,android_url,ios_url,password,expires_at,geo_targets,social_tags,http_status,cloaking,tracking_ids,ab_test_config,click_limit`;

            const response = await fetch(supabaseUrl, {
                headers: {
                    'apikey': env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
                }
            });

            if (!response.ok) {
                // DB Error or 404
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

                // --- 4. TARGET ALGORITHM ---
                let targetUrl = linkData.original;

                // A. A/B Testing
                if (linkData.ab_test_config && linkData.ab_test_config.variation) {
                    // split is % for Original Page. Default 50.
                    const split = parseInt(linkData.ab_test_config.split || 50);
                    if (Math.random() * 100 > split) {
                        targetUrl = linkData.ab_test_config.variation;
                    }
                }

                // B. Geo-Targeting
                const country = request.cf?.country;
                let geoMatched = false;
                if (country && linkData.geo_targets && Array.isArray(linkData.geo_targets)) {
                    const geoRule = linkData.geo_targets.find(r => r.country === country);
                    if (geoRule && geoRule.url) {
                        targetUrl = geoRule.url;
                        geoMatched = true;
                    }
                }

                // C. Mobile Targeting (If Geo didn't match)
                if (!geoMatched) {
                    const isAndroid = /Android/i.test(userAgent);
                    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

                    if (isAndroid && linkData.android_url) {
                        targetUrl = linkData.android_url;
                    } else if (isIOS && linkData.ios_url) {
                        targetUrl = linkData.ios_url;
                    }
                }

                // --- 5. ANALYTICS (Fire and Forget) ---
                ctx.waitUntil(trackClickDetails(env, linkData.id, request, targetUrl));

                // --- 6. CLOAKING & TRACKING ---
                const hasTracking = linkData.tracking_ids && (linkData.tracking_ids.ga4 || linkData.tracking_ids.fb_pixel || linkData.tracking_ids.adroll);
                const isCloaked = linkData.cloaking;

                if (isCloaked || hasTracking) {
                    return new Response(getWrapperPage(targetUrl, linkData, isCloaked, hasTracking), {
                        headers: { 'Content-Type': 'text/html' }
                    });
                }

                // --- 7. STANDARD REDIRECT ---
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

function getWrapperPage(targetUrl, linkData, isCloaked, hasTracking) {
    const { tracking_ids, social_tags } = linkData;
    const title = social_tags?.title || 'Redirecting...';

    let scripts = '';
    if (tracking_ids?.ga4) {
        scripts += `
            <!-- Google Analytics -->
            <script async src="https://www.googletagmanager.com/gtag/js?id=${tracking_ids.ga4}"></script>
            <script>
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${tracking_ids.ga4}');
            </script>
        `;
    }
    if (tracking_ids?.fb_pixel) {
        scripts += `
            <!-- Facebook Pixel -->
            <script>
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${tracking_ids.fb_pixel}');
                fbq('track', 'PageView');
            </script>
        `;
    }

    if (isCloaked) {
        // Full Iframe Cloaking
        return `
            <!DOCTYPE html>
            <html lang="en" style="height:100%;overflow:hidden;">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                ${scripts}
                <style>body,html,iframe{margin:0;padding:0;height:100%;width:100%;border:none;}</style>
            </head>
            <body>
                <iframe src="${targetUrl}" allowfullscreen></iframe>
            </body>
            </html>
        `;
    } else {
        // Redirect Interstitial with Pixels
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                ${scripts}
                <script>
                    setTimeout(function() {
                        window.location.href = "${targetUrl}";
                    }, 800); // 800ms delay to allow pixels to fire
                </script>
                <style>
                    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9fafb; color: #6b7280; }
                    .loader { border: 3px solid #f3f3f3; border-radius: 50%; border-top: 3px solid #34d399; width: 24px; height: 24px; animation: spin 1s linear infinite; margin-right: 12px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="loader"></div> Redirecting...
            </body>
            </html>
        `;
    }
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
