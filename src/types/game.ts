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
  isCritical?: boolean;
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

export type TabType = 'main' | 'prestige' | 'settings';

export interface PrestigeUpgrade {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: number;
  level: number;
  maxLevel: number;
}

export interface GameState {
  souls: Decimal;
  totalSoulsEver: Decimal;
  clickPower: Decimal;
  buildings: Building[];
  floatingTexts: FloatingTextItem[];
  stage: number;
  killCount: number;
  killsToNext: number;
  enemy: Enemy;
  battlePhase: BattlePhase;
  bossTimeLeft: number;
  defeatStage: number;
  screenFlash: boolean;
  crystals: number;
  prestigeUpgrades: PrestigeUpgrade[];
  prestigeCount: number;
  activeTab: TabType;
  showPrestigeConfirm: boolean;
  showStageClear: boolean;
  lastSaveTime: number;   // Unix timestamp（ms）
}