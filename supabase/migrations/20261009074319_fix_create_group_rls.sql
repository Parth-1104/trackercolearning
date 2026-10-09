/*
# Fix: study_groups insert cannot read back via .select() due to RLS

## Problem
After inserting into study_groups, calling .select() returns zero rows
because the SELECT policy (select_joined_groups) requires the user to
already be a member — but membership is inserted AFTER the group is created.
This creates a chicken-and-egg problem.

## Fix
Create a SECURITY DEFINER function `create_group_with_member` that:
1. Inserts a new study_groups row
2. Inserts a group_members row for the calling user
3. Returns the new group record

This bypasses RLS for both inserts in a single atomic RPC call.
*/

CREATE OR REPLACE FUNCTION public.create_group_with_member(group_name text)
RETURNS public.study_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group public.study_groups;
BEGIN
  INSERT INTO public.study_groups (name)
  VALUES (group_name)
  RETURNING * INTO new_group;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (new_group.id, auth.uid());

  RETURN new_group;
END;
$$;
