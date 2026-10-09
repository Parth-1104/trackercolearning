import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Users, Youtube } from 'lucide-react';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email, password, displayName);
      if (error) setError(error);
    } else {
      const { error } = await signIn(email, password);
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
          <h1 className="text-3xl font-bold text-white">GATE 2027 Tracker</h1>
          <p className="mt-2 text-sm text-gray-400">
            Study together. Compete together. Win together.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex gap-2 rounded-lg bg-gray-800/60 p-1">
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === 'signup' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                mode === 'signin' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-blue-500/40 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-2 border-t border-gray-800 pt-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="h-4 w-4 text-blue-400" />
              Share a group code with your study partner
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Youtube className="h-4 w-4 text-red-400" />
              Auto-tracks your YouTube watch position
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
