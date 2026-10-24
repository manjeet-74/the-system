import { StatusBar } from '../components/hud/StatusBar';
import { QuestList } from '../components/quests/QuestList';

export function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section>
        <StatusBar />
      </section>
      <section>
        <QuestList />
      </section>
    </div>
  );
}
