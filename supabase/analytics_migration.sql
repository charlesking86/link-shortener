-- Enable the UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create the heavy-duty analytics table
create table click_events (
  id uuid default uuid_generate_v4() primary key,
  link_id bigint references links(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Geo Data (Cloudflare provides this)
  country text,
  city text,
  region text,
  
  -- User Data
  user_agent text,
  browser text,
  os text,
  device text, -- 'mobile', 'desktop', 'tablet'
  
  -- Traffic Data
  referrer text,
  ip text
);

-- Add RLS (Row Level Security) so users can only see clicks for their own links
alter table click_events enable row level security;

create policy "Users can view clicks for their own links"
  on click_events for select
  using (
    exists (
      select 1 from links
      where links.id = click_events.link_id
      and links.user_id = auth.uid()
    )
  );

-- (Optional) If you want the worker to be able to insert without Auth
-- We usually use the SERVICE_ROLE key or ANON key with specific policies.
-- Since our Worker uses the Anon key, we need to allow inserts for everyone (or specifically the worker).
-- For now, simplest is to allow Anon inserts (public analytics ingestion).
create policy "Allow anonymous ingestion"
  on click_events for insert
  with check (true);
