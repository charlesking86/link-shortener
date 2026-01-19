/**
 * Cloudflare Worker for Link Shortener Redirects
 * 
 * 1. Takes the request path (e.g. /my-link)
 * 2. Checks Supabase DB for the original URL
 * 3. Redirects the user or returns 404
 */

import { createClient } from '@supabase/supabase-js'

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url)
        const slug = url.pathname.slice(1) // Remove leading slash

        // 1. Handle root request (Dashboard)
        // If you are hosting the dashboard on the same domain (e.g. via Pages), 
        // usually Pages handles this before the Worker, or you route / to the dashboard.
        // Assuming this Worker is ONLY for redirects on a short domain (e.g. sho.rt/*)
        if (!slug || slug === '') {
            return new Response('Welcome to Link Shortener', { status: 200 })
        }

        // 2. Setup Supabase Client
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)

        // 3. Lookup Slug
        const { data, error } = await supabase
            .from('links')
            .select('original')
            .eq('slug', slug)
            .single()

        // 4. Redirect or 404
        if (data && data.original) {
            // Optional: Fire and forget click tracking
            ctx.waitUntil(trackClick(supabase, slug))

            return Response.redirect(data.original, 301)
        }

        return new Response('Link not found', { status: 404 })
    }
}

async function trackClick(supabase, slug) {
    await supabase.rpc('increment_clicks', { slug_input: slug })
}
