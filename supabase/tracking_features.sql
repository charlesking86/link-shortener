-- Add columns for robust tracking and A/B testing
ALTER TABLE links 
ADD COLUMN IF NOT EXISTS tracking_ids jsonb DEFAULT '{}'::jsonb, -- { "ga4": "...", "fb_pixel": "..." }
ADD COLUMN IF NOT EXISTS ab_test_config jsonb DEFAULT '{}'::jsonb; -- { "variation_url": "...", "traffic_split": 50 }

-- Update social_tags to be more robust if needed (it's already jsonb)
-- Ensure http_status is int
ALTER TABLE links 
ALTER COLUMN http_status SET DEFAULT 302;
