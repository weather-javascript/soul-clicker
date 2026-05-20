import type { OfflineBonus } from '../hooks/useGameState';
import { formatNumber } from '../utils/formatNumber';

interface Props {
  bonus: OfflineBonus;
  onAccept: () => void;
}

export function OfflineBonusModal({ bonus, onAccept }: Props) {
  const hours = Math.floor(bonus.seconds / 3600);
  const mins  = Math.floor((bonus.seconds % 3600) / 60);
  const timeStr = hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;

  return (
    <div className="offline-overlay">
      <div className="offline-modal">
        <div className="offline-icon">🌙</div>
        <div className="offline-title">おかえりなさい！</div>
        <div className="offline-time">不在時間: {timeStr}</div>
        <div className="offline-body">
          留守の間に仲間たちが<br />魂を集めていました
        </div>
        <div className="offline-reward">
          +{formatNumber(bonus.souls)}
          <span className="offline-reward-label"> ソウル</span>
        </div>
        <button className="offline-btn" onClick={onAccept}>受け取る！</button>
      </div>
    </div>
  );
}