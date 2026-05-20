import Decimal from 'decimal.js';

export interface Building {
  id: string;
  name: string;
  emoji: string;
  baseCost: Decimal;
  baseSps: Decimal;        // 秒間生産量（base）
  count: number;           // 現在の所持数
  costMultiplier: Decimal; // コスト倍率（1.15）
}

export interface FloatingTextItem {
  id: number;
  text: string;
  x: number;
  y: number;
}

export interface GameState {
  souls: Decimal;
  totalSouls: Decimal;      // 累計（実績などに使う）
  clickPower: Decimal;
  buildings: Building[];
  floatingTexts: FloatingTextItem[];
}