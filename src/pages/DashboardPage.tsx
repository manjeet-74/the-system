import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] p-8">
      <header className="flex justify-between items-center max-w-4xl mx-auto border-b border-[#3fd6f5]/20 pb-4 mb-8">
        <div>
          <h1 className="font-rajdhani text-3xl font-bold text-[#3fd6f5]">
            THE SYSTEM
          </h1>
          <p className="text-sm text-[#6d81a0]">
            Logged in as: <span className="text-[#e6f1f7]">{user?.email ?? user?.user_metadata?.user_name}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="border border-[#ff4d5e] text-[#ff4d5e] hover:bg-[#ff4d5e]/10 font-rajdhani font-semibold px-4 py-2 rounded transition-colors duration-200 cursor-pointer"
        >
          Sign Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-[#0a0f1c] border border-[#3fd6f5]/20 rounded-lg p-6 text-center">
          <h2 className="font-rajdhani text-2xl font-semibold text-[#3fd6f5] mb-2">
            HUNTER DASHBOARD
          </h2>
          <p className="text-[#6d81a0]">
            Welcome to THE SYSTEM. Dashboard HUD components will be linked in upcoming commits.
          </p>
        </div>
      </main>
    </div>
  );
}
