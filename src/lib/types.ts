export interface Profile {
  id: string;
  display_name: string;
  avatar_color: string;
  created_at: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Video {
  id: string;
  group_id: string;
  youtube_id: string;
  title: string;
  url: string;
  duration_seconds: number | null;
  category: string | null;
  added_by: string | null;
  created_at: string;
}

export interface WatchProgress {
  id: string;
  video_id: string;
  user_id: string;
  current_position: number;
  completed: boolean;
  last_watched_at: string;
}

export interface VideoWithProgress extends Video {
  my_progress?: WatchProgress;
  all_progress?: WatchProgress[];
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_color: string;
  total_watched_seconds: number;
  videos_completed: number;
  videos_watched: number;
  total_videos: number;
  last_active: string | null;
}
