import Decimal from 'decimal.js';
import { formatNumber } from '../utils/formatNumber';
import type { GameState } from '../types/game';
import type { Buffs } from '../hooks/useGameState';
import { PrestigeShop } from './PrestigeShop';

interface Props {
  state: GameState;
  buffs: Buffs;
  crystalPreview: number;
  onPrestige: () => void;
  onBuyUpgrade: (id: string) => void;
}

export function PrestigeTab({ state, crystalPreview, onPrestige, onBuyUpgrade }: Props) {
  const totalGain = state.crystals + crystalPreview;

  return (
    <div className="prestige-tab">
      {/* 結晶所持数 */}
      <div className="crystal-display">
        <div className="crystal-icon">💎</div>
        <div className="crystal-count">{state.crystals.toLocaleString()}</div>
        <div className="crystal-label">次元結晶</div>
        {state.prestigeCount > 0 && (
          <div className="prestige-count-badge">転生 {state.prestigeCount} 回目</div>
        )}
      </div>

      {/* 転生プレビュー */}
      <div className="prestige-preview">
        <div className="preview-title">⚗️ 転生シミュレーション</div>
        <div className="preview-rows">
          <div className="preview-row">
            <span className="preview-label">総獲得ソウル</span>
            <span className="preview-value">{formatNumber(state.totalSoulsEver)}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">現在の結晶</span>
            <span className="preview-value crystal-val">{state.crystals}</span>
          </div>
          <div className="preview-row highlight">
            <span className="preview-label">今転生すると…</span>
            <span className="preview-value gain-val">+{crystalPreview} 💎</span>
          </div>
          <div className="preview-row total">
            <span className="preview-label">転生後の合計</span>
            <span className="preview-value total-val">{totalGain} 💎</span>
          </div>
        </div>

        <button
          className={`prestige-btn ${crystalPreview > 0 ? 'active' : 'inactive'}`}
          onClick={onPrestige}
        >
          <span className="prestige-btn-icon">🌀</span>
          <span className="prestige-btn-text">次元転生する</span>
          <span className="prestige-btn-sub">+{crystalPreview} 結晶獲得</span>
        </button>

        <p className="prestige-warning">
          ⚠️ ソウル・施設・ステージがリセットされます
        </p>
      </div>

      {/* 永続ショップ */}
      <PrestigeShop
        upgrades={state.prestigeUpgrades}
        crystals={state.crystals}
        onBuy={onBuyUpgrade}
      />
    </div>
  );
}