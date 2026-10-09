import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { formatDuration } from '@/lib/youtube';
import { Clock, CheckCircle2, PlayCircle, TrendingUp, Video as VideoIcon } from 'lucide-react';

export default function StatsOverview() {
  const { user } = useAuth();
  const { group, members } = useGroup();
  const [stats, setStats] = useState({
    myWatchedSeconds: 0,
    myCompleted: 0,
    myWatched: 0,
    totalVideos: 0,
    partnerWatchedSeconds: 0,
    partnerCompleted: 0,
    partnerName: '',
    partnerColor: '#6b7280',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!group || !user) {
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
        setLoading(false);
        return;
      }

      const { data: progress } = await supabase
        .from('watch_progress')
        .select('*')
        .in('video_id', videoIds);

      let mySeconds = 0;
      let myCompleted = 0;
      let myWatched = 0;
      let partnerSeconds = 0;
      let partnerCompleted = 0;
      let partnerName = '';
      let partnerColor = '#6b7280';

      const partner = members.find((m) => m.user_id !== user.id);

      for (const p of progress || []) {
        if (p.user_id === user.id) {
          mySeconds += p.current_position;
          if (p.completed) myCompleted += 1;
          if (p.current_position > 0) myWatched += 1;
        } else if (partner && p.user_id === partner.user_id) {
          partnerSeconds += p.current_position;
          if (p.completed) partnerCompleted += 1;
        }
      }

      if (partner) {
        partnerName = partner.profile?.display_name || 'Partner';
        partnerColor = partner.profile?.avatar_color || '#6b7280';
      }

      setStats({
        myWatchedSeconds: mySeconds,
        myCompleted,
        myWatched,
        totalVideos,
        partnerWatchedSeconds: partnerSeconds,
        partnerCompleted,
        partnerName,
        partnerColor,
      });

      setLoading(false);
    }

    loadStats();
  }, [group, user, members]);

  if (loading) return null;

  const diff = stats.myCompleted - stats.partnerCompleted;
  const secDiff = stats.myWatchedSeconds - stats.partnerWatchedSeconds;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <VideoIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.totalVideos}</p>
            <p className="text-xs text-gray-500">Total Videos</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
            <Clock className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{formatDuration(stats.myWatchedSeconds)}</p>
            <p className="text-xs text-gray-500">Your Watch Time</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats.myCompleted}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <TrendingUp className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0'}
            </p>
            <p className="text-xs text-gray-500">vs {stats.partnerName || 'Partner'}</p>
          </div>
        </div>
      </div>

      {stats.partnerName && (
        <div className="col-span-full rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900/80 to-gray-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: stats.partnerColor }}
              >
                {stats.partnerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{stats.partnerName}</p>
                <p className="text-xs text-gray-500">
                  {formatDuration(stats.partnerWatchedSeconds)} watched · {stats.partnerCompleted} completed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-500">Videos Gap</p>
                <p className={`text-lg font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {diff > 0 ? `You lead by ${diff}` : diff < 0 ? `Behind by ${Math.abs(diff)}` : 'Tied'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Watch Time Gap</p>
                <p className={`text-lg font-bold ${secDiff > 0 ? 'text-green-400' : secDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {secDiff > 0 ? `+${formatDuration(secDiff)}` : secDiff < 0 ? `-${formatDuration(Math.abs(secDiff))}` : 'Tied'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
