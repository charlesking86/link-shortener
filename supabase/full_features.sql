-- Add Advanced Features to Links Table

-- 1. Geo-Targeting: Stores array of { country: 'US', url: '...' }
alter table links add column if not exists geo_targets jsonb default '[]'::jsonb;

-- 2. Social Media Tags: Stores { title, description, image_url } for OpenGraph/Twitter Cards
alter table links add column if not exists social_tags jsonb default '{}'::jsonb;

-- 3. HTTP Status: 301 (Permanent), 302 (Temporary), 307, etc.
alter table links add column if not exists http_status int2 default 301;

-- 4. Cloaking: If true, use iframe/masking (Optional, mostly for affiliate links)
alter table links add column if not exists cloaking boolean default false;
