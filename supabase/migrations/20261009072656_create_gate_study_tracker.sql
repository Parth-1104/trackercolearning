/*
# GATE 2027 Co-Learning Tracker — Initial Schema

## Purpose
Competitive YouTube study tracker for GATE 2027 prep. Two friends share a group,
add YouTube video links, and track watch progress with auto-saved timestamps.

## New Tables
- profiles (display_name, avatar_color)
- study_groups (name)
- group_members (group_id, user_id — junction table)
- videos (group_id, youtube_id, title, url, duration_seconds, category, added_by)
- watch_progress (video_id, user_id, current_position, completed, last_watched_at)

## Security
All tables have RLS. Group members can see each other's data within shared groups.
Watch progress writes are owner-only; reads visible to group members for leaderboard.

## Notes
1. Auto-create profile trigger on auth.users signup.
2. Owner columns default to auth.uid().
*/

-- ===== Create all tables first =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  youtube_id text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  duration_seconds integer,
  category text,
  added_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  current_position integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, user_id)
);

-- ===== Enable RLS on all tables =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_progress ENABLE ROW LEVEL SECURITY;

-- ===== profiles policies =====
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== study_groups policies =====
DROP POLICY IF EXISTS "select_joined_groups" ON study_groups;
CREATE POLICY "select_joined_groups" ON study_groups FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = study_groups.id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_groups" ON study_groups;
CREATE POLICY "insert_groups" ON study_groups FOR INSERT
  TO authenticated WITH CHECK (true);

-- ===== group_members policies =====
DROP POLICY IF EXISTS "select_group_members" ON group_members;
CREATE POLICY "select_group_members" ON group_members FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_membership" ON group_members;
CREATE POLICY "insert_own_membership" ON group_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_membership" ON group_members;
CREATE POLICY "delete_own_membership" ON group_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== videos policies =====
DROP POLICY IF EXISTS "select_group_videos" ON videos;
CREATE POLICY "select_group_videos" ON videos FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = videos.group_id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_group_videos" ON videos;
CREATE POLICY "insert_group_videos" ON videos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = videos.group_id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_group_videos" ON videos;
CREATE POLICY "update_group_videos" ON videos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = videos.group_id AND gm.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = videos.group_id AND gm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_group_videos" ON videos;
CREATE POLICY "delete_group_videos" ON videos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = videos.group_id AND gm.user_id = auth.uid())
  );

-- ===== watch_progress policies =====
DROP POLICY IF EXISTS "select_group_watch_progress" ON watch_progress;
CREATE POLICY "select_group_watch_progress" ON watch_progress FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN group_members gm ON gm.group_id = v.group_id
      WHERE v.id = watch_progress.video_id AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_watch_progress" ON watch_progress;
CREATE POLICY "insert_own_watch_progress" ON watch_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_watch_progress" ON watch_progress;
CREATE POLICY "update_own_watch_progress" ON watch_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_watch_progress" ON watch_progress;
CREATE POLICY "delete_own_watch_progress" ON watch_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_group_id ON videos(group_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_video_id ON watch_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_id ON watch_progress(user_id);

-- ===== Auto-create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#3b82f6')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
