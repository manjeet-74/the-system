import { StatusBar } from '../components/hud/StatusBar';
import { SystemMessage } from '../components/hud/SystemMessage';
import { QuestList } from '../components/quests/QuestList';

export function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="space-y-4">
        <SystemMessage />
        <StatusBar />
      </section>
      <section>
        <QuestList />
      </section>
    </div>
  );
}
