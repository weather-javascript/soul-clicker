import type { PrestigeUpgrade } from '../types/game';
import { calcUpgradeCost } from '../hooks/useGameState';

interface Props {
  upgrades: PrestigeUpgrade[];
  crystals: number;
  onBuy: (id: string) => void;
}

export function PrestigeShop({ upgrades, crystals, onBuy }: Props) {
  return (
    <div className="prestige-shop">
      <h3 className="shop-title">✨ 永続アップグレード</h3>
      <div className="shop-list">
        {upgrades.map(u => {
          const cost = calcUpgradeCost(u);
          const canBuy = crystals >= cost && u.level < u.maxLevel;
          const isMax = u.level >= u.maxLevel;

          return (
            <div key={u.id} className={`shop-card ${canBuy ? 'can-buy' : ''} ${isMax ? 'maxed' : ''}`}>
              <div className="shop-card-top">
                <span className="shop-emoji">{u.emoji}</span>
                <div className="shop-info">
                  <div className="shop-name">{u.name}</div>
                  <div className="shop-desc">{u.description}</div>
                </div>
                <div className="shop-level">
                  <span className="level-num">{u.level}</span>
                  <span className="level-max">/{u.maxLevel}</span>
                </div>
              </div>
              <button
                className={`shop-buy-btn ${canBuy ? 'buyable' : ''} ${isMax ? 'maxed-btn' : ''}`}
                onClick={() => onBuy(u.id)}
                disabled={!canBuy}
              >
                {isMax ? '🔒 MAX' : `💎 ${cost} 結晶`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}