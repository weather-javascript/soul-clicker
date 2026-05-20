import type Decimal from 'decimal.js';

export interface Building {
  id: string;
  name: string;
  emoji: string;
  baseCost: Decimal;
  baseSps: Decimal;
  count: number;
  costMultiplier: Decimal;
}

export interface FloatingTextItem {
  id: number;
  text: string;
  x: number;
  y: number;
}

export interface Enemy {
  currentHp: Decimal;
  maxHp: Decimal;
  isBoss: boolean;
}

export type BattlePhase =
  | 'normal'       // 通常ステージ
  | 'boss_warning' // ボス警告演出中（2秒）
  | 'boss_battle'  // ボス戦中
  | 'boss_failed'  // ボス敗北
  | 'stage_clear'; // ステージクリア演出中

export interface GameState {
  souls: Decimal;
  totalSouls: Decimal;
  clickPower: Decimal;
  buildings: Building[];
  floatingTexts: FloatingTextItem[];
  // ステージ関連
  stage: number;
  killCount: number;        // 現ステージの討伐数
  killsToNext: number;      // 次ステージまでの討伐数（通常10）
  enemy: Enemy;
  battlePhase: BattlePhase;
  bossTimeLeft: number;     // ボス残り秒数
  defeatStage: number;      // ボス敗北時に戻るステージ
  // エフェクト
  screenFlash: boolean;
}