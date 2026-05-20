import type { BattlePhase } from '../types/game';

interface Props {
  battlePhase: BattlePhase;
  onRetry: () => void;
  bossStage: number;
}

export function BossWarning({ battlePhase, onRetry, bossStage }: Props) {
  if (battlePhase === 'boss_warning') {
    return (
      <div className="boss-warning-overlay">
        <div className="boss-warning-content">
          <div className="boss-warning-text">⚠️ BOSS WARNING ⚠️</div>
          <div className="boss-warning-stage">Stage {bossStage + 1}</div>
          <div className="boss-warning-sub">強大な敵が現れた…</div>
        </div>
      </div>
    );
  }

  if (battlePhase === 'boss_failed') {
    return (
      <div className="boss-failed-overlay">
        <div className="boss-failed-content">
          <div className="boss-failed-title">💀 DEFEAT 💀</div>
          <div className="boss-failed-sub">ボスを倒せなかった</div>
          <div className="boss-failed-back">Stage {bossStage} に戻される…</div>
          <button className="retry-button" onClick={onRetry}>
            ⚔️ 再挑戦する
          </button>
        </div>
      </div>
    );
  }

  return null;
}