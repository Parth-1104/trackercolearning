import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { extractYouTubeId } from '@/lib/youtube';
import type { Video } from '@/lib/types';
import { X, Link2, Tag, Loader2 } from 'lucide-react';

interface AddVideoModalProps {
  onClose: () => void;
  onAdded: (video: Video) => void;
}

const CATEGORIES = ['DBMS', 'OS', 'CN', 'DSA', 'Maths', 'COA', 'TOC', 'DBMS', 'Digital Logic', 'Aptitude', 'General', 'Other'];

export default function AddVideoModal({ onClose, onAdded }: AddVideoModalProps) {
  const { user } = useAuth();
  const { group } = useGroup();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!group || !user) return;

    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      setError('Could not extract a YouTube video ID from that URL. Please check the link.');
      return;
    }

    setLoading(true);

    const finalTitle = title.trim() || `Video ${youtubeId}`;

    const { data, error: insertError } = await supabase
      .from('videos')
      .insert({
        group_id: group.id,
        youtube_id: youtubeId,
        title: finalTitle,
        url: url.trim(),
        category: category || null,
        added_by: user.id,
      })
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onAdded(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Add YouTube Video</h2>
          <button onClick={onClose} className="text-gray-500 transition hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <Link2 className="h-3.5 w-3.5" /> YouTube URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Video Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. GATE DBMS - Normalization"
            />
            <p className="mt-1.5 text-xs text-gray-500">Leave blank to auto-generate from the URL</p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <Tag className="h-3.5 w-3.5" /> Category (optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a subject...</option>
              {[...new Set(CATEGORIES)].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/40 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
            ) : (
              'Add Video'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
