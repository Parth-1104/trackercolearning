import { useState } from 'react';
import { useGroup } from '@/context/GroupContext';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Plus, LogIn, LogOut } from 'lucide-react';

export default function GroupSetup() {
  const { createGroup, joinGroup } = useGroup();
  const { signOut, profile } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'create') {
      const { error } = await createGroup(groupName);
      if (error) setError(error);
    } else {
      const { error } = await joinGroup(groupCode.trim());
      if (error) setError(error);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome, {profile?.display_name}</h1>
          <p className="mt-2 text-sm text-gray-400">Set up your study group to get started</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex gap-2 rounded-lg bg-gray-800/60 p-1">
            <button
              onClick={() => { setMode('create'); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === 'create' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Group
            </button>
            <button
              onClick={() => { setMode('join'); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === 'join' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Join Group
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'create' ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. GATE 2027 Squad"
                />
                <p className="mt-2 text-xs text-gray-500">
                  You'll get a group code to share with your study partner
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Group Code</label>
                <input
                  type="text"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Paste the group ID here"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Ask your partner for the group ID after they create a group
                </p>
              </div>
            )}

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
              {mode === 'create' ? (
                <><Plus className="h-4 w-4" /> {loading ? 'Creating...' : 'Create Group'}</>
              ) : (
                <><LogIn className="h-4 w-4" /> {loading ? 'Joining...' : 'Join Group'}</>
              )}
            </button>
          </form>

          <button
            onClick={() => signOut()}
            className="mt-4 flex w-full items-center justify-center gap-2 text-xs text-gray-500 transition hover:text-gray-300"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
