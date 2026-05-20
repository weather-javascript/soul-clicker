import Decimal from 'decimal.js';
import { formatNumber, formatSps } from '../utils/formatNumber';

interface Props {
  souls: Decimal;
  totalSouls: Decimal;
  sps: Decimal;
}

export function SoulDisplay({ souls, totalSouls, sps }: Props) {
  return (
    <div className="soul-display">
      <div className="soul-icon">👻</div>
      <div className="soul-count">{formatNumber(souls)}</div>
      <div className="soul-label">ソウル</div>
      <div className="soul-stats">
        <span>合計: {formatNumber(totalSouls)}</span>
        <span className="sps">{formatSps(sps)}</span>
      </div>
    </div>
  );
}