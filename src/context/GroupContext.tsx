import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { StudyGroup, GroupMember, Profile } from '@/lib/types';

interface GroupContextValue {
  group: StudyGroup | null;
  members: GroupMember[];
  loading: boolean;
  joinGroup: (groupId: string) => Promise<{ error: string | null }>;
  createGroup: (name: string) => Promise<{ error: string | null; groupId?: string }>;
  refreshGroup: () => Promise<void>;
}

const GroupContext = createContext<GroupContextValue | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroup = useCallback(async () => {
    if (!user) {
      setGroup(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    const { data: memberships, error: memError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id);

    if (memError || !memberships || memberships.length === 0) {
      setGroup(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    const groupId = memberships[0].group_id;

    const { data: groupData } = await supabase
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    const { data: memberData } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);

    const memberIds = (memberData || []).map((m) => m.user_id);
    let profilesMap: Record<string, Profile> = {};
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberIds);
      profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, Profile>);
    }

    const membersWithProfiles: GroupMember[] = (memberData || []).map((m) => ({
      ...m,
      profile: profilesMap[m.user_id],
    }));

    setGroup(groupData);
    setMembers(membersWithProfiles);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const joinGroup = async (groupId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        return { error: 'You are already in this group' };
      }
      return { error: error.message };
    }

    await loadGroup();
    return { error: null };
  };

  const createGroup = async (name: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { data, error: rpcError } = await supabase
      .rpc('create_group_with_member', { group_name: name });

    if (rpcError) return { error: rpcError.message };
    if (!data) return { error: 'Failed to create group' };

    await loadGroup();
    return { error: null, groupId: data.id };
  };

  const refreshGroup = async () => {
    await loadGroup();
  };

  return (
    <GroupContext.Provider value={{ group, members, loading, joinGroup, createGroup, refreshGroup }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used within GroupProvider');
  return ctx;
}
