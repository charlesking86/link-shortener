-- Add security features to links table
alter table links 
add column if not exists password text,
add column if not exists expires_at timestamp with time zone;

-- Optional: Index on expires_at for cleanup jobs (if we ever do that)
create index if not exists idx_links_expires_at on links(expires_at);
