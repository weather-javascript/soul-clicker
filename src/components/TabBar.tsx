import type { TabType } from '../types/game';

interface Props {
  activeTab: TabType;
  crystals: number;
  onTabChange: (tab: TabType) => void;
}

export function TabBar({ activeTab, crystals, onTabChange }: Props) {
  return (
    <nav className="tab-bar">
      <button className={`tab-btn ${activeTab === 'main' ? 'active' : ''}`} onClick={() => onTabChange('main')}>
        <span className="tab-icon">⚔️</span>
        <span className="tab-label">バトル</span>
      </button>
      <button className={`tab-btn ${activeTab === 'prestige' ? 'active' : ''}`} onClick={() => onTabChange('prestige')}>
        <span className="tab-icon">🌀</span>
        <span className="tab-label">転生</span>
        {crystals > 0 && <span className="tab-badge">{crystals}</span>}
      </button>
      <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => onTabChange('settings')}>
        <span className="tab-icon">⚙️</span>
        <span className="tab-label">設定</span>
      </button>
    </nav>
  );
}