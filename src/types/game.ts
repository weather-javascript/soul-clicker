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
  | 'normal'
  | 'boss_warning'
  | 'boss_battle'
  | 'boss_failed'
  | 'stage_clear';

export type TabType = 'main' | 'prestige';

// 永続アップグレード定義
export interface PrestigeUpgrade {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;       // 結晶コスト（初期）
  level: number;
  maxLevel: number;
  // コスト計算: baseCost * (level + 1) で線形増加
}

export interface GameState {
  // リソース
  souls: Decimal;
  totalSoulsEver: Decimal;   // 累計（転生しても減らない）
  clickPower: Decimal;       // base click power（バフ前）
  buildings: Building[];
  floatingTexts: FloatingTextItem[];

  // ステージ・戦闘
  stage: number;
  killCount: number;
  killsToNext: number;
  enemy: Enemy;
  battlePhase: BattlePhase;
  bossTimeLeft: number;
  defeatStage: number;
  screenFlash: boolean;

  // プレステージ
  crystals: number;          // 所持次元結晶
  prestigeUpgrades: PrestigeUpgrade[];
  prestigeCount: number;     // 転生回数（演出用）

  // UI
  activeTab: TabType;
  showPrestigeConfirm: boolean;
}