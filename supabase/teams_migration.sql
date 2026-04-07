-- 1. Create the Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Create Team Members table (for assigning roles to users)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) DEFAULT 'viewer',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(team_id, user_id)
);

-- 3. Add team_id to existing tables so links/domains can be owned by a team
ALTER TABLE links ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security (RLS) for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies for teams
-- A user can see a team if they are the owner OR if they are a member
CREATE POLICY "Users can view teams they belong to" 
ON teams FOR SELECT 
USING (
    owner_id = auth.uid() OR 
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);

-- Only owners can create or update teams
CREATE POLICY "Users can create teams" 
ON teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update teams" 
ON teams FOR UPDATE 
USING (owner_id = auth.uid());

-- 6. Create policies for team_members
-- Members can see other members of their teams
CREATE POLICY "Members can view teammates" 
ON team_members FOR SELECT 
USING (
    team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM teams WHERE owner_id = auth.uid()
    )
);

-- Only Admins or Owners can add/remove members (Simplified: letting anyone in the team update for now, we will enforce in UI)
CREATE POLICY "Owners can manage team members" 
ON team_members FOR ALL 
USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
);
