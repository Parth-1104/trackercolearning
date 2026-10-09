import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import type { Video, WatchProgress } from '@/lib/types';
import { getYouTubeThumbnail, formatDuration, formatTimeAgo, formatPercent } from '@/lib/youtube';
import YouTubePlayer from '@/components/YouTubePlayer';
import { Play, Plus, Trash2, Search, X, CheckCircle2, Clock, Tag } from 'lucide-react';

interface VideoListProps {
  onAddClick: () => void;
  refreshTrigger: number;
}

export default function VideoList({ onAddClick, refreshTrigger }: VideoListProps) {
  const { user } = useAuth();
  const { group, members } = useGroup();
  const [videos, setVideos] = useState<Video[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const progressRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadVideos() {
    if (!group) {
      setLoading(false);
      return;
    }

    const { data: videoData } = await supabase
      .from('videos')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false });

    setVideos(videoData || []);

    if (videoData && videoData.length > 0) {
      const videoIds = videoData.map((v) => v.id);
      const { data: progressData } = await supabase
        .from('watch_progress')
        .select('*')
        .in('video_id', videoIds);

      const map: Record<string, WatchProgress[]> = {};
      for (const p of progressData || []) {
        if (!map[p.video_id]) map[p.video_id] = [];
        map[p.video_id].push(p);
      }
      setProgressMap(map);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadVideos();
  }, [group, refreshTrigger]);

  const loadVideosRef = useRef(loadVideos);
  loadVideosRef.current = loadVideos;

  const handleProgressSaved = useCallback(() => {
    if (progressRefreshTimer.current) clearTimeout(progressRefreshTimer.current);
    progressRefreshTimer.current = setTimeout(() => {
      loadVideosRef.current();
    }, 5000);
  }, []);

  async function handleDelete(video: Video) {
    if (!confirm(`Delete "${video.title}"? This removes it for everyone in the group.`)) return;

    await supabase.from('videos').delete().eq('id', video.id);
    await loadVideos();
  }

  function getMyProgress(videoId: string): WatchProgress | undefined {
    if (!user) return undefined;
    return progressMap[videoId]?.find((p) => p.user_id === user.id);
  }

  function getMemberProgress(videoId: string, userId: string): WatchProgress | undefined {
    return progressMap[videoId]?.find((p) => p.user_id === userId);
  }

  const categories = [...new Set(videos.map((v) => v.category).filter(Boolean))] as string[];

  const filtered = videos.filter((v) => {
    if (filter !== 'all' && v.category !== filter) return false;
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 py-16 text-center">
        <Play className="mb-4 h-12 w-12 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-300">No videos yet</h3>
        <p className="mt-1 text-sm text-gray-500">Add your first YouTube video to start tracking</p>
        <button
          onClick={onAddClick}
          className="mt-4 flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" /> Add Video
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="all">All subjects</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        <button
          onClick={onAddClick}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((video) => {
          const myProgress = getMyProgress(video.id);
          const percent = video.duration_seconds
            ? formatPercent(myProgress?.current_position || 0, video.duration_seconds)
            : myProgress?.completed
              ? 100
              : myProgress?.current_position
                ? 50
                : 0;

          return (
            <div
              key={video.id}
              className="group overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 transition hover:border-gray-700"
            >
              <div
                className="relative aspect-video cursor-pointer overflow-hidden"
                onClick={() => setActiveVideo(video)}
              >
                <img
                  src={getYouTubeThumbnail(video.youtube_id)}
                  alt={video.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/90 shadow-lg">
                    <Play className="h-6 w-6 text-white" fill="white" />
                  </div>
                </div>
                {myProgress?.completed && (
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-1 text-xs font-medium text-white">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </div>
                )}
                {!myProgress?.completed && (myProgress?.current_position ?? 0) > 0 && (
                  <div className="absolute right-2 top-2 rounded-full bg-blue-500/90 px-2 py-1 text-xs font-medium text-white">
                    {percent}%
                  </div>
                )}
                {video.duration_seconds && (
                  <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                    {formatDuration(video.duration_seconds)}
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3
                  className="cursor-pointer line-clamp-2 text-sm font-semibold text-white transition hover:text-blue-400"
                  onClick={() => setActiveVideo(video)}
                >
                  {video.title}
                </h3>

                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  {video.category && (
                    <span className="flex items-center gap-1 rounded-md bg-gray-800 px-2 py-0.5">
                      <Tag className="h-3 w-3" /> {video.category}
                    </span>
                  )}
                  <span>{formatTimeAgo(video.created_at)}</span>
                </div>

                {myProgress && myProgress.current_position > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                      <div
                        className={`h-full rounded-full transition-all ${myProgress.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {members.map((m) => {
                      const mp = getMemberProgress(video.id, m.user_id);
                      const isMe = m.user_id === user?.id;
                      return (
                        <div
                          key={m.user_id}
                          className="relative"
                          title={`${m.profile?.display_name}: ${mp?.completed ? 'Completed' : mp?.current_position ? formatDuration(mp.current_position) : 'Not started'}`}
                        >
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-gray-900"
                            style={{ backgroundColor: m.profile?.avatar_color || '#3b82f6' }}
                          >
                            {m.profile?.display_name.charAt(0).toUpperCase()}
                          </div>
                          {mp?.completed && (
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-gray-900">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {isMe && (
                            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-400 ring-2 ring-gray-900" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleDelete(video)}
                    className="text-gray-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    title="Delete video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500">No videos match your search</div>
      )}

      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-white">{activeVideo.title}</h2>
                {activeVideo.category && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                    <Tag className="h-3 w-3" /> {activeVideo.category}
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="shrink-0 text-gray-500 transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <YouTubePlayer
              video={activeVideo}
              existingProgress={getMyProgress(activeVideo.id)}
              onProgressSaved={handleProgressSaved}
            />

            <div className="mt-4 flex items-center gap-4 border-t border-gray-800 pt-4">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-400">
                Your position auto-saves every 2 seconds while watching. It also saves on pause, close, and tab switch.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
