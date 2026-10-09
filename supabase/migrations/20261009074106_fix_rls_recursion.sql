/*
# Fix infinite recursion in group_members RLS policy

## Problem
The `select_group_members` policy on `group_members` checks membership by
querying `group_members` itself, creating an infinite recursion:
  policy on group_members → queries group_members → triggers same policy → ...

This also blocks `study_groups`, `videos`, and `watch_progress` policies
that join/reference `group_members`.

## Fix
1. Create a SECURITY DEFINER function `is_group_member(group_uuid)` that
   checks membership by querying `group_members` with elevated privileges
   (bypassing RLS), breaking the recursion.
2. Replace all inline `group_members` subqueries in RLS policies with
   calls to this function.

## Changes
- New function: `public.is_group_member(uuid) → boolean`
- Updated policies on: group_members, study_groups, videos, watch_progress
*/

-- ===== SECURITY DEFINER function to check group membership (bypasses RLS) =====
CREATE OR REPLACE FUNCTION public.is_group_member(group_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_uuid AND gm.user_id = auth.uid()
  );
$$;

-- ===== Fix group_members SELECT policy (was self-referential) =====
DROP POLICY IF EXISTS "select_group_members" ON group_members;
CREATE POLICY "select_group_members" ON group_members FOR SELECT
  TO authenticated USING (public.is_group_member(group_id));

-- ===== Fix study_groups SELECT policy =====
DROP POLICY IF EXISTS "select_joined_groups" ON study_groups;
CREATE POLICY "select_joined_groups" ON study_groups FOR SELECT
  TO authenticated USING (public.is_group_member(id));

-- ===== Fix videos policies =====
DROP POLICY IF EXISTS "select_group_videos" ON videos;
CREATE POLICY "select_group_videos" ON videos FOR SELECT
  TO authenticated USING (public.is_group_member(group_id));

DROP POLICY IF EXISTS "insert_group_videos" ON videos;
CREATE POLICY "insert_group_videos" ON videos FOR INSERT
  TO authenticated WITH CHECK (public.is_group_member(group_id));

DROP POLICY IF EXISTS "update_group_videos" ON videos;
CREATE POLICY "update_group_videos" ON videos FOR UPDATE
  TO authenticated USING (public.is_group_member(group_id))
  WITH CHECK (public.is_group_member(group_id));

DROP POLICY IF EXISTS "delete_group_videos" ON videos;
CREATE POLICY "delete_group_videos" ON videos FOR DELETE
  TO authenticated USING (public.is_group_member(group_id));

-- ===== Fix watch_progress SELECT policy =====
DROP POLICY IF EXISTS "select_group_watch_progress" ON watch_progress;
CREATE POLICY "select_group_watch_progress" ON watch_progress FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = watch_progress.video_id AND public.is_group_member(v.group_id)
    )
  );
