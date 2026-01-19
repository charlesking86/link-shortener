# Deploying Your Link Shortener

## 1. Frontend (Dashboard) - Cloudflare Pages

1.  Push your code to **GitHub**.
2.  Log in to **Cloudflare Dashboard** -> **Workers & Pages**.
3.  Click **Create Application** -> **Pages** -> **Connect to Git**.
4.  Select your repo `link-shortener`.
5.  **Build Settings:**
    *   **Framework:** Vite
    *   **Build command:** `npm run build`
    *   **Output directory:** `dist`
6.  **Environment Variables:** Add your Supabase keys from `.env`.
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`
7.  Click **Deploy**.

## 2. Backend (Redirects) - Cloudflare Workers

1.  In Cloudflare Dashboard -> **Workers & Pages**.
2.  Click **Create Application** -> **Create Worker**.
3.  Name it (e.g., `shortener-redirect`).
4.  Click **Deploy** (with default hello world code first).
5.  Click **Edit Code**.
6.  Copy/Paste the content of `cloudflare/worker.js` (from this project) into the editor.
7.  **Settings -> Variables:**
    *   Add `SUPABASE_URL`
    *   Add `SUPABASE_ANON_KEY`
8.  **Triggers -> Custom Domains:**
    *   Add your custom domain route (e.g., `yourdomain.com/*`) to intercept all traffic.
