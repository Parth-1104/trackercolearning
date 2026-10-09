import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { Trophy, Video as VideoIcon, BarChart3, Plus, LogOut, Copy, Check, Users } from 'lucide-react';
import VideoList from '@/components/VideoList';
import Leaderboard from '@/components/Leaderboard';
import StatsOverview from '@/components/StatsOverview';
import AddVideoModal from '@/components/AddVideoModal';
import type { Video } from '@/lib/types';

type Tab = 'videos' | 'leaderboard';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { group, members } = useGroup();
  const [tab, setTab] = useState<Tab>('videos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [copied, setCopied] = useState(false);

  function handleVideoAdded(_video: Video) {
    setRefreshTrigger((n) => n + 1);
    setTab('videos');
  }

  function copyGroupCode() {
    if (!group) return;
    navigator.clipboard.writeText(group.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">GATE 2027 Tracker</h1>
              <p className="text-xs text-gray-500">{group?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyGroupCode}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition hover:border-gray-600 hover:text-white"
              title="Copy group ID to share with your study partner"
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-green-400" /> Copied!</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Group Code</>
              )}
            </button>

            <div className="flex items-center -space-x-2">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-gray-950"
                  style={{ backgroundColor: m.profile?.avatar_color || '#3b82f6' }}
                  title={m.profile?.display_name}
                >
                  {m.profile?.display_name.charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length < 2 && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-gray-700 bg-gray-900 text-gray-600 ring-2 ring-gray-950">
                  <Users className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: profile?.avatar_color || '#3b82f6' }}
              title={profile?.display_name}
            >
              {profile?.display_name.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={() => signOut()}
              className="text-gray-500 transition hover:text-red-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {members.length < 2 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3">
            <Users className="h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200">
              Share your group code with your study partner so they can join and the competition begins!
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6">
          <StatsOverview />
        </div>

        {/* Tab navigation */}
        <div className="mb-6 flex gap-1 rounded-xl bg-gray-900/60 p-1">
          <button
            onClick={() => setTab('videos')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
              tab === 'videos' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <VideoIcon className="h-4 w-4" /> Videos
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
              tab === 'leaderboard' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Leaderboard
          </button>
        </div>

        {/* Tab content */}
        {tab === 'videos' ? (
          <VideoList onAddClick={() => setShowAddModal(true)} refreshTrigger={refreshTrigger} />
        ) : (
          <Leaderboard />
        )}
      </main>

      {showAddModal && (
        <AddVideoModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleVideoAdded}
        />
      )}

      {/* Floating add button (mobile) */}
      {tab === 'videos' && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-xl shadow-blue-500/30 transition hover:scale-105 active:scale-95 sm:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
