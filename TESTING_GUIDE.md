# Testing Your Link Shortener - Step by Step

## 1. Open Your Dashboard
1.  Go to your Cloudflare Pages URL (from the earlier step):  
    `https://link-shortener-evu.pages.dev`
    *(Note: If you forgot it, go to Cloudflare Dashboard -> Workers & Pages -> link-shortener -> Visit site)*
2.  **Log In** with your email if asked.

## 2. Create a Short Link
1.  Click the **"New Link"** button (top right).
2.  **Destination URL:** Enter `https://www.google.com`
3.  **Slug (Optional):** Enter `goog` (or something simple).
4.  Click **Create**.
5.  You should see the new link appear in your list!

## 3. Test the Redirect (The "Magic" Part)
Since we haven't connected a custom domain yet, your "Short Link" lives on your **Worker URL**.

1.  Find your Worker URL:
    *   Go to Cloudflare Dashboard.
    *   Click **Workers & Pages**.
    *   Click `damp-tree-e186` (your worker name).
    *   On the right side, find the **"Visit"** link or "Preview URL". It should look like `https://damp-tree-e186.mpmarketingkingsley001.workers.dev`.
2.  Combine that URL with your slug.
    *   Example: `https://damp-tree-e186.mpmarketingkingsley001.workers.dev/goog`
3.  **Paste that into your browser** and hit Enter.
4.  **Result:** You should be instantly redirected to Google!

## 4. Verify Analytics
1.  Go back to your Dashboard tab.
2.  Refresh the page.
3.  Look at the "Clicks" column for that link.
4.  It should now say **1** (or more)!

## 5. Troubleshooting
*   **"Link not found"?** Make sure you typed the slug exactly right in the Worker URL.
*   **Dashboard empty?** refresh the page.
*   **Redirect error?** Check your Supabase Table in the SQL Editor to ensure the `original` URL is correct.
