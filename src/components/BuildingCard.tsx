import Decimal from 'decimal.js';
import type { Building } from '../types/game';
import { formatNumber } from '../utils/formatNumber';
import { calcCost } from '../hooks/useGameState';

interface Props {
  building: Building;
  currentSouls: Decimal;
  onBuy: (id: string) => void;
}

export function BuildingCard({ building, currentSouls, onBuy }: Props) {
  const cost = calcCost(building);
  const canAfford = currentSouls.gte(cost);
  const spsContrib = building.baseSps.mul(building.count);

  return (
    <div className={`building-card ${canAfford ? 'can-afford' : 'cannot-afford'}`}>
      <div className="building-emoji">{building.emoji}</div>
      <div className="building-info">
        <div className="building-name">{building.name}</div>
        <div className="building-sps">
          {building.count > 0
            ? `生産: ${formatNumber(spsContrib)}/秒`
            : `初期SPS: ${formatNumber(building.baseSps)}/秒`}
        </div>
      </div>
      <div className="building-right">
        <div className="building-count">{building.count}</div>
        <button
          className={`buy-button ${canAfford ? 'buyable' : 'not-buyable'}`}
          onClick={() => onBuy(building.id)}
          disabled={!canAfford}
          aria-label={`${building.name}を購入 コスト: ${formatNumber(cost)} ソウル`}
        >
          <span className="buy-cost">💎 {formatNumber(cost)}</span>
        </button>
      </div>
    </div>
  );
}