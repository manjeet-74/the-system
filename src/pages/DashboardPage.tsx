import { useAuth } from '../hooks/useAuth';
import { StatusBar } from '../components/hud/StatusBar';
import { QuestList } from '../components/quests/QuestList';

export function DashboardPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#04070d] text-[#e6f1f7] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Navigation */}
        <header className="flex justify-between items-center border-b border-[#3fd6f5]/20 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-rajdhani text-3xl font-extrabold tracking-wider text-[#3fd6f5]">
              THE SYSTEM
            </h1>
            <span className="text-[10px] font-rajdhani font-bold bg-[#3fd6f5]/10 text-[#3fd6f5] border border-[#3fd6f5]/30 px-2 py-0.5 rounded tracking-widest">
              HUD v1.0
            </span>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="border border-[#ff4d5e]/40 text-[#ff4d5e] hover:bg-[#ff4d5e]/10 font-rajdhani font-semibold px-4 py-1.5 rounded transition-colors text-sm cursor-pointer"
          >
            Sign Out
          </button>
        </header>

        {/* HUD Status Bar */}
        <section>
          <StatusBar />
        </section>

        {/* Daily Quests List */}
        <section>
          <QuestList />
        </section>
      </div>
    </div>
  );
}
