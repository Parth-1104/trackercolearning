import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import type { LeaderboardEntry } from '@/lib/types';
import { formatDuration, formatTimeAgo } from '@/lib/youtube';
import { Trophy, Crown, Flame, Clock, CheckCircle2, PlayCircle } from 'lucide-react';

export default function Leaderboard() {
  const { user } = useAuth();
  const { group, members } = useGroup();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      if (!group || members.length === 0) {
        setLoading(false);
        return;
      }

      const { data: videos } = await supabase
        .from('videos')
        .select('id')
        .eq('group_id', group.id);

      const videoIds = (videos || []).map((v) => v.id);
      const totalVideos = videoIds.length;

      if (videoIds.length === 0) {
        const entries: LeaderboardEntry[] = members.map((m) => ({
          user_id: m.user_id,
          display_name: m.profile?.display_name || 'Unknown',
          avatar_color: m.profile?.avatar_color || '#3b82f6',
          total_watched_seconds: 0,
          videos_completed: 0,
          videos_watched: 0,
          total_videos: 0,
          last_active: null,
        }));
        setEntries(entries);
        setLoading(false);
        return;
      }

      const { data: progress } = await supabase
        .from('watch_progress')
        .select('*')
        .in('video_id', videoIds);

      const memberMap = new Map(members.map((m) => [m.user_id, m]));

      const statsMap = new Map<string, {
        total_watched_seconds: number;
        videos_completed: number;
        videos_watched: number;
        last_active: string | null;
      }>();

      for (const p of progress || []) {
        const existing = statsMap.get(p.user_id) || {
          total_watched_seconds: 0,
          videos_completed: 0,
          videos_watched: 0,
          last_active: null,
        };

        existing.total_watched_seconds += p.current_position;
        if (p.completed) existing.videos_completed += 1;
        if (p.current_position > 0) existing.videos_watched += 1;
        if (!existing.last_active || p.last_watched_at > existing.last_active) {
          existing.last_active = p.last_watched_at;
        }

        statsMap.set(p.user_id, existing);
      }

      const leaderboardEntries: LeaderboardEntry[] = members.map((m) => {
        const stats = statsMap.get(m.user_id) || {
          total_watched_seconds: 0,
          videos_completed: 0,
          videos_watched: 0,
          last_active: null,
        };
        return {
          user_id: m.user_id,
          display_name: m.profile?.display_name || 'Unknown',
          avatar_color: m.profile?.avatar_color || '#3b82f6',
          total_watched_seconds: stats.total_watched_seconds,
          videos_completed: stats.videos_completed,
          videos_watched: stats.videos_watched,
          total_videos: totalVideos,
          last_active: stats.last_active,
        };
      });

      leaderboardEntries.sort((a, b) => {
        if (b.videos_completed !== a.videos_completed) return b.videos_completed - a.videos_completed;
        return b.total_watched_seconds - a.total_watched_seconds;
      });

      setEntries(leaderboardEntries);
      setLoading(false);
    }

    loadLeaderboard();
  }, [group, members]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <Trophy className="mx-auto mb-3 h-12 w-12 text-gray-700" />
        <p>No members yet</p>
      </div>
    );
  }

  const leader = entries[0];
  const isTie = entries.length > 1 && entries[0].videos_completed === entries[1]?.videos_completed;

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const isMe = entry.user_id === user?.id;
        const isLeading = index === 0 && !isTie && entry.videos_completed > 0;
        const rank = index + 1;

        return (
          <div
            key={entry.user_id}
            className={`relative overflow-hidden rounded-2xl border p-5 transition ${
              isMe
                ? 'border-blue-500/50 bg-blue-950/30'
                : 'border-gray-800 bg-gray-900/60'
            }`}
          >
            {isLeading && (
              <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
            )}

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  rank === 1 ? 'bg-amber-500/20 text-amber-400' :
                  rank === 2 ? 'bg-gray-600/20 text-gray-300' :
                  'bg-gray-700/20 text-gray-400'
                }`}>
                  {rank === 1 && entry.videos_completed > 0 ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    rank
                  )}
                </div>
              </div>

              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg"
                style={{ backgroundColor: entry.avatar_color }}
              >
                {entry.display_name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-white">{entry.display_name}</h3>
                  {isMe && (
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                      You
                    </span>
                  )}
                  {isLeading && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                      <Flame className="h-3 w-3" /> Leading
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {entry.last_active ? `Active ${formatTimeAgo(entry.last_active)}` : 'Not started yet'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {formatDuration(entry.total_watched_seconds)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <PlayCircle className="h-3.5 w-3.5" />
                    {entry.videos_watched}/{entry.total_videos}
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {entry.videos_completed}
                  </span>
                </div>
              </div>
            </div>

            {entry.total_videos > 0 && (
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(entry.videos_completed / entry.total_videos) * 100}%`,
                      backgroundColor: entry.avatar_color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
