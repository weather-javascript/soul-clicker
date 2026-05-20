import Decimal from 'decimal.js';
import { formatNumber } from '../utils/formatNumber';
import { getEnemyName } from '../hooks/useGameState';
import type { Enemy, BattlePhase } from '../types/game';

interface Props {
  enemy: Enemy;
  stage: number;
  battlePhase: BattlePhase;
}

const ENEMY_EMOJIS: Record<string, string> = {
  'ゴブリン': '👺',
  'スケルトン': '💀',
  'ゾンビ': '🧟',
  'ダークエルフ': '🧝',
  'リッチ': '👻',
  'デーモン': '😈',
  'ドラゴン': '🐉',
  '炎の番人': '🔥',
  '影の王': '🌑',
  '骸骨皇帝': '👑',
  '冥府の門番': '⚫',
  '混沌の化身': '🌀',
  '虚無の支配者': '🕳️',
};

export function EnemyArea({ enemy, stage, battlePhase }: Props) {
  const isBoss = enemy.isBoss;
  const name = getEnemyName(stage, isBoss);
  const emoji = ENEMY_EMOJIS[name] ?? (isBoss ? '👹' : '👾');
  const hpPercent = enemy.maxHp.gt(0)
    ? enemy.currentHp.div(enemy.maxHp).mul(100).toNumber()
    : 0;

  const isDefeated = enemy.currentHp.lte(0);

  return (
    <div className={`enemy-area ${isBoss ? 'boss-enemy' : ''} ${isDefeated ? 'defeated' : ''}`}>
      <div className="enemy-name-row">
        <span className="enemy-emoji">{emoji}</span>
        <span className={`enemy-name ${isBoss ? 'boss-name' : ''}`}>{name}</span>
        {isBoss && <span className="boss-badge">BOSS</span>}
      </div>

      {/* HPバー */}
      <div className="hp-bar-wrap">
        <div
          className={`hp-bar ${isBoss ? 'boss-hp-bar' : ''} ${hpPercent < 25 ? 'low-hp' : ''}`}
          style={{ width: `${Math.max(0, hpPercent)}%` }}
        />
      </div>
      <div className="hp-text">
        <span>{formatNumber(enemy.currentHp.lt(0) ? new Decimal(0) : enemy.currentHp)}</span>
        <span className="hp-separator"> / </span>
        <span className="hp-max">{formatNumber(enemy.maxHp)}</span>
      </div>
    </div>
  );
}