import { getStageName } from '../hooks/useGameState';
import type { BattlePhase } from '../types/game';

interface Props {
  stage: number;
  killCount: number;
  killsToNext: number;
  battlePhase: BattlePhase;
  bossTimeLeft: number;
}

export function StageHeader({ stage, killCount, killsToNext, battlePhase, bossTimeLeft }: Props) {
  const isBoss = battlePhase === 'boss_battle' || battlePhase === 'boss_warning';

  return (
    <div className={`stage-header ${isBoss ? 'boss-mode' : ''}`}>
      <div className="stage-info">
        <span className="stage-number">Stage {stage}</span>
        <span className="stage-name">{getStageName(stage)}</span>
      </div>

      {battlePhase === 'boss_battle' && (
        <div className="boss-timer">
          <div className="boss-timer-bar-wrap">
            <div
              className="boss-timer-bar"
              style={{ width: `${(bossTimeLeft / 30) * 100}%` }}
            />
          </div>
          <span className={`boss-timer-count ${bossTimeLeft <= 10 ? 'danger' : ''}`}>
            ⏱ {bossTimeLeft}s
          </span>
        </div>
      )}

      {battlePhase === 'normal' && (
        <div className="kill-progress">
          <div className="kill-bar-wrap">
            <div
              className="kill-bar"
              style={{ width: `${(killCount / killsToNext) * 100}%` }}
            />
          </div>
          <span className="kill-count">{killCount} / {killsToNext}</span>
        </div>
      )}
    </div>
  );
}