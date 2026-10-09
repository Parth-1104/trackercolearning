import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GroupProvider, useGroup } from '@/context/GroupContext';
import AuthScreen from '@/components/AuthScreen';
import GroupSetup from '@/components/GroupSetup';
import Dashboard from '@/components/Dashboard';

function AppContent() {
  const { user, loading } = useAuth();
  const { group, loading: groupLoading } = useGroup();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />
      </div>
    );
  }

  if (!group) {
    return <GroupSetup />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <GroupProvider>
        <AppContent />
      </GroupProvider>
    </AuthProvider>
  );
}

export default App;
