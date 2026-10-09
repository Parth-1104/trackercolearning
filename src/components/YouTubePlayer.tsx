import { useRef, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Video, WatchProgress } from '@/lib/types';
import { formatDuration } from '@/lib/youtube';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoaded = false;
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const check = () => {
      if (apiLoaded) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      resolve();
    };

    setTimeout(check, 100);
  });

  return apiLoadPromise;
}

interface YouTubePlayerProps {
  video: Video;
  existingProgress?: WatchProgress;
  onProgressSaved?: (position: number, duration: number, completed: boolean) => void;
}

export default function YouTubePlayer({ video, existingProgress, onProgressSaved }: YouTubePlayerProps) {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [currentPos, setCurrentPos] = useState(existingProgress?.current_position || 0);
  const [duration, setDuration] = useState(video.duration_seconds || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refs to avoid stale closures in interval
  const lastSavedPosRef = useRef(existingProgress?.current_position || 0);
  const videoRef = useRef(video);
  const userRef = useRef(user);
  const onProgressSavedRef = useRef(onProgressSaved);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => { videoRef.current = video; }, [video]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { onProgressSavedRef.current = onProgressSaved; }, [onProgressSaved]);

  // Centralized save function using refs — always has fresh values
  const saveProgress = useCallback(async (positionOverride?: number) => {
    const player = playerRef.current;
    const currentUser = userRef.current;
    const currentVideo = videoRef.current;
    if (!player || !currentUser || !currentVideo) return;

    try {
      const pos = positionOverride !== undefined ? positionOverride : Math.floor(player.getCurrentTime());
      const dur = player.getDuration() || 0;

      if (pos < 0) return;

      const isCompleted = dur > 0 && pos / dur >= 0.9;

      // Only write to DB if position changed by at least 3 seconds, or completion state changed
      if (
        positionOverride === undefined &&
        Math.abs(pos - lastSavedPosRef.current) < 3 &&
        isCompleted === completedRef.current
      ) {
        return;
      }

      setSaveStatus('saving');
      setSaveError(null);

      const { error } = await supabase
        .from('watch_progress')
        .upsert(
          {
            video_id: currentVideo.id,
            user_id: currentUser.id,
            current_position: pos,
            completed: isCompleted,
            last_watched_at: new Date().toISOString(),
          },
          { onConflict: 'video_id,user_id' }
        );

      if (error) {
        setSaveError('Failed to save progress');
        setSaveStatus('idle');
        return;
      }

      lastSavedPosRef.current = pos;
      completedRef.current = isCompleted;
      setCurrentPos(pos);
      if (dur > 0) setDuration(dur);
      setSaveStatus('saved');
      onProgressSavedRef.current?.(pos, dur, isCompleted);

      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setSaveStatus('idle');
    }
  }, []);

  // Initialize player once per video
  useEffect(() => {
    let cancelled = false;
    setIsReady(false);

    async function initPlayer() {
      await loadYouTubeAPI();

      if (cancelled || !playerContainerRef.current) return;

      // Clear any previous player
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }

      // Reset the container so YouTube can inject a fresh iframe
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = '';
        const inner = document.createElement('div');
        playerContainerRef.current.appendChild(inner);

        playerRef.current = new window.YT.Player(inner, {
          videoId: video.youtube_id,
          playerVars: {
            start: existingProgress?.current_position || 0,
            autoplay: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (e: any) => {
              if (cancelled) return;
              const dur = e.target.getDuration();
              if (dur > 0) setDuration(dur);
              setIsReady(true);

              // Update stored duration on the videos table
              if (video.duration_seconds !== Math.floor(dur) && dur > 0) {
                supabase
                  .from('videos')
                  .update({ duration_seconds: Math.floor(dur) })
                  .eq('id', video.id)
                  .then(({ error }: any) => {
                    if (error) console.error('Failed to update video duration:', error);
                  });
              }

              // Seek to last saved position
              if (existingProgress?.current_position && existingProgress.current_position > 5) {
                e.target.seekTo(existingProgress.current_position, true);
                setCurrentPos(existingProgress.current_position);
              }
            },
            onStateChange: (e: any) => {
              const state = e.data;
              const YT = window.YT;
              setIsPlaying(state === YT.PlayerState.PLAYING);

              // Save on pause
              if (state === YT.PlayerState.PAUSED) {
                saveProgress();
              }

              // Save when video ends
              if (state === YT.PlayerState.ENDED) {
                saveProgress();
              }
            },
            onError: () => {
              setSaveError('This video could not be loaded. Check the URL.');
            },
          },
        });
      }
    }

    initPlayer();

    return () => {
      cancelled = true;
      // Save final position before unmounting
      if (playerRef.current) {
        try {
          const pos = Math.floor(playerRef.current.getCurrentTime());
          if (pos > 0) saveProgress(pos);
        } catch { /* ignore */ }
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  // Auto-save interval — runs every 2 seconds once player is ready
  useEffect(() => {
    if (!isReady) return;

    saveTimerRef.current = setInterval(() => {
      saveProgress();
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isReady, saveProgress]);

  // Save position when tab is closed or page is hidden
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        saveProgress();
      }
    }
    function handleBeforeUnload() {
      saveProgress();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveProgress]);

  // Live position display update (separate from DB saves — updates every 500ms for smooth UI)
  useEffect(() => {
    if (!isReady) return;

    const uiTimer = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const pos = Math.floor(playerRef.current.getCurrentTime());
        const dur = playerRef.current.getDuration();
        setCurrentPos(pos);
        if (dur > 0) setDuration(dur);
      } catch { /* ignore */ }
    }, 500);

    return () => clearInterval(uiTimer);
  }, [isReady]);

  const percent = duration > 0 ? Math.min(100, (currentPos / duration) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
        <div
          ref={playerContainerRef}
          className="absolute inset-0 h-full w-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:h-full [&>iframe]:w-full"
        />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
              <p className="text-sm text-gray-400">Loading video...</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-800/60 px-4 py-3">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
            <span>{formatDuration(currentPos)} / {formatDuration(duration)}</span>
            <span className="font-semibold text-gray-300">{Math.round(percent)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPlaying && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Playing
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-xs text-amber-400">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-400">Saved</span>
          )}
          {saveError && (
            <span className="text-xs text-red-400">{saveError}</span>
          )}
          <button
            onClick={() => saveProgress()}
            className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-gray-600"
          >
            Save position
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className={`h-2 w-2 rounded-full ${saveStatus === 'saving' ? 'bg-amber-400' : saveStatus === 'saved' ? 'bg-green-400' : 'bg-gray-600'}`} />
        Auto-saving every 2 seconds while watching. Position is also saved on pause, close, and tab switch.
      </div>
    </div>
  );
}
