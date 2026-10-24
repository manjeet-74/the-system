import { useForge } from '../hooks/useForge';
import { ForgeCard } from '../components/forge/ForgeCard';
import { ForgeHistory } from '../components/forge/ForgeHistory';

export function ForgePage() {
  const { activeChallenge, history, loading, error, completeForge, isCompleting } = useForge();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="font-rajdhani text-2xl font-bold text-[#3fd6f5] tracking-wider">THE FORGE</h2>
        <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">
          Streak milestones unlock special challenges. Complete them for bonus XP.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-[#3fd6f5]/30 border-t-[#3fd6f5] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-3 border border-[#ff4d5e]/40 bg-[#ff4d5e]/10 rounded text-sm text-[#ff4d5e] font-rajdhani">
          Failed to load forge challenges: {(error as Error).message}
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="space-y-3">
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
              ACTIVE CHALLENGE
            </h3>
            {activeChallenge ? (
              <ForgeCard
                challenge={activeChallenge}
                onComplete={completeForge}
                isCompleting={isCompleting}
              />
            ) : (
              <div className="border border-[#3fd6f5]/10 rounded-lg p-6 text-center">
                <p className="text-[#6d81a0] font-rajdhani text-sm">
                  No active forge challenge. Keep your streak going — challenges unlock at 3, 5, 7, 14, and 30 days.
                </p>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
              HISTORY
            </h3>
            <ForgeHistory challenges={history} />
          </section>
        </>
      )}
    </div>
  );
}
