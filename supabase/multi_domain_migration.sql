-- Add domain column to links table
alter table links 
add column if not exists domain text;

-- Update existing links to use the primary domain (optional, or leave null if global)
-- update links set domain = 'gobd.site' where domain is null;

-- Drop the old unique constraint on slug alone
alter table links drop constraint if exists links_slug_key;

-- Add new composite unique constraint (slug + domain must be unique together)
alter table links add constraint unique_slug_per_domain unique (slug, domain);
