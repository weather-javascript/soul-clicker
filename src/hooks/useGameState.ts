import { useState, useEffect, useCallback } from 'react';
import Decimal from 'decimal.js';
import type {
  GameState, Building, FloatingTextItem,
  Enemy, BattlePhase, PrestigeUpgrade,
} from '../types/game';

// ============================================================
// 定数
// ============================================================
const KILLS_TO_NEXT   = 10;
const BOSS_TIME_BASE  = 30;   // ボス基本制限時間（秒）
const BOSS_INTERVAL   = 5;

const INITIAL_BUILDINGS: Building[] = [
  { id: 'apprentice',  name: '見習い剣士', emoji: '⚔️',  baseCost: new Decimal(15),    baseSps: new Decimal(1),   count: 0, costMultiplier: new Decimal(1.15) },
  { id: 'dark_mage',   name: '闇魔道士',   emoji: '🧙',  baseCost: new Decimal(100),   baseSps: new Decimal(8),   count: 0, costMultiplier: new Decimal(1.15) },
  { id: 'death_knight',name: 'デスナイト', emoji: '💀',  baseCost: new Decimal(1100),  baseSps: new Decimal(47),  count: 0, costMultiplier: new Decimal(1.15) },
  { id: 'demon_lord',  name: '魔王の眷属', emoji: '👿',  baseCost: new Decimal(12000), baseSps: new Decimal(260), count: 0, costMultiplier: new Decimal(1.15) },
  { id: 'lich_king',   name: 'リッチキング',emoji: '🦴', baseCost: new Decimal(130000),baseSps: new Decimal(1400),count: 0, costMultiplier: new Decimal(1.15) },
];

const INITIAL_PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  {
    id: 'soul_vessel',
    name: '魂の器',
    emoji: '🔮',
    description: '全ソウル生産量（クリック＆SPS）が +50%（乗算）',
    baseCost: 1,
    level: 0,
    maxLevel: 20,
  },
  {
    id: 'divine_speed',
    name: '神速の加護',
    emoji: '⚡',
    description: 'クリック攻撃力のみ +100%（乗算）',
    baseCost: 2,
    level: 0,
    maxLevel: 15,
  },
  {
    id: 'time_warp',
    name: '時空の歪み',
    emoji: '⏳',
    description: 'ボス戦の制限時間 +5秒',
    baseCost: 3,
    level: 0,
    maxLevel: 10,
  },
  {
    id: 'crystal_heart',
    name: '結晶の心臓',
    emoji: '💎',
    description: '転生時の結晶獲得量 +20%（乗算）',
    baseCost: 5,
    level: 0,
    maxLevel: 10,
  },
];

// ============================================================
// ヘルパー関数
// ============================================================

// バフ計算
export interface Buffs {
  totalMultiplier: Decimal;   // 全生産倍率（魂の器）
  clickMultiplier: Decimal;   // クリック追加倍率（神速の加護）
  bossTimeBonus: number;      // ボス時間ボーナス（秒）
  crystalMultiplier: Decimal; // 結晶獲得倍率（結晶の心臓）
}

export function calcBuffs(upgrades: PrestigeUpgrade[]): Buffs {
  let totalMul = new Decimal(1);
  let clickMul = new Decimal(1);
  let bossTime = 0;
  let crystalMul = new Decimal(1);

  for (const u of upgrades) {
    if (u.level === 0) continue;
    if (u.id === 'soul_vessel')   totalMul   = totalMul.mul(new Decimal(1.5).pow(u.level));
    if (u.id === 'divine_speed')  clickMul   = clickMul.mul(new Decimal(2).pow(u.level));
    if (u.id === 'time_warp')     bossTime  += u.level * 5;
    if (u.id === 'crystal_heart') crystalMul = crystalMul.mul(new Decimal(1.2).pow(u.level));
  }

  return { totalMultiplier: totalMul, clickMultiplier: clickMul, bossTimeBonus: bossTime, crystalMultiplier: crystalMul };
}

// 転生で得られる結晶数（バフ反映前のraw値）
export function calcCrystalGain(totalSoulsEver: Decimal, crystalMul: Decimal): number {
  // floor( sqrt( totalSoulsEver / 1e9 ) ) — フェーズ3序盤でも結晶が取れるよう1e9に調整
  const raw = totalSoulsEver.div(1e9).sqrt().floor();
  return raw.mul(crystalMul).floor().toNumber();
}

// プレステージアップグレードのコスト
export function calcUpgradeCost(u: PrestigeUpgrade): number {
  // baseCost * (level + 1) で線形増加
  return u.baseCost * (u.level + 1);
}

// 敵HP
function calcEnemyHp(stage: number, isBoss: boolean): Decimal {
  const base = new Decimal(10).mul(new Decimal(1.4).pow(stage - 1));
  return isBoss ? base.mul(10) : base;
}

function calcReward(maxHp: Decimal, totalMul: Decimal): Decimal {
  return maxHp.mul(0.2).mul(totalMul).ceil();
}

function isBossStage(stage: number): boolean {
  return stage % BOSS_INTERVAL === 0;
}

function createEnemy(stage: number, isBoss: boolean): Enemy {
  const maxHp = calcEnemyHp(stage, isBoss);
  return { currentHp: maxHp, maxHp, isBoss };
}

export function calcCost(building: Building): Decimal {
  return building.baseCost.mul(building.costMultiplier.pow(building.count));
}

export function calcTotalSps(buildings: Building[], buffs: Buffs): Decimal {
  const raw = buildings.reduce((acc, b) => acc.add(b.baseSps.mul(b.count)), new Decimal(0));
  return raw.mul(buffs.totalMultiplier);
}

export function calcClickPower(base: Decimal, buffs: Buffs): Decimal {
  return base.mul(buffs.totalMultiplier).mul(buffs.clickMultiplier);
}

// ステージ名・敵名
export function getStageName(stage: number): string {
  if (stage <= 4)  return ['始まりの荒野','枯れた森','血塗れの峠','亡者の洞窟'][stage - 1];
  if (stage <= 9)  return ['炎の城門','呪われた沼','死霊の墓地','魔の砂漠','氷結の回廊'][stage - 5];
  if (stage <= 20) return `冥府 ${stage}層`;
  if (stage <= 50) return `混沌 ${stage}層`;
  return `虚無 ${stage}層`;
}

export function getEnemyName(stage: number, isBoss: boolean): string {
  if (isBoss) {
    const b = ['炎の番人','影の王','骸骨皇帝','冥府の門番','混沌の化身','虚無の支配者'];
    return b[Math.floor((stage / BOSS_INTERVAL - 1) % b.length)];
  }
  const e = ['ゴブリン','スケルトン','ゾンビ','ダークエルフ','リッチ','デーモン','ドラゴン'];
  return e[(stage - 1) % e.length];
}

// ============================================================
// 初期State
// ============================================================
let floatingIdCounter = 0;

function createInitialState(): GameState {
  return {
    souls: new Decimal(0),
    totalSoulsEver: new Decimal(0),
    clickPower: new Decimal(1),
    buildings: INITIAL_BUILDINGS,
    floatingTexts: [],
    stage: 1,
    killCount: 0,
    killsToNext: KILLS_TO_NEXT,
    enemy: createEnemy(1, false),
    battlePhase: 'normal',
    bossTimeLeft: BOSS_TIME_BASE,
    defeatStage: 1,
    screenFlash: false,
    crystals: 0,
    prestigeUpgrades: INITIAL_PRESTIGE_UPGRADES,
    prestigeCount: 0,
    activeTab: 'main',
    showPrestigeConfirm: false,
  };
}

// ============================================================
// メインフック
// ============================================================
export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);

  // バフ（毎レンダーで再計算）
  const buffs = calcBuffs(state.prestigeUpgrades);
  const totalSps = calcTotalSps(state.buildings, buffs);
  const effectiveClickPower = calcClickPower(state.clickPower, buffs);
  const bossTimeLimit = BOSS_TIME_BASE + buffs.bossTimeBonus;
  const crystalPreview = calcCrystalGain(state.totalSoulsEver, buffs.crystalMultiplier);

  // --------------------------------------------------------
  // ゲームループ（1秒ごと）
  // --------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const b = calcBuffs(prev.prestigeUpgrades);
        const sps = calcTotalSps(prev.buildings, b);
        const phase = prev.battlePhase;
        let next = { ...prev };

        // SPS加算（常時）
        next.souls = prev.souls.add(sps);
        next.totalSoulsEver = prev.totalSoulsEver.add(sps);

        if (phase === 'boss_warning' || phase === 'boss_failed' || phase === 'stage_clear') return next;

        // SPSダメージ
        if (sps.gt(0)) {
          const result = applyDamage(next, sps, b, bossTimeLimit);
          next = result;
        }

        // ボスタイマー
        if (phase === 'boss_battle') {
          const newTime = prev.bossTimeLeft - 1;
          if (newTime <= 0) {
            next.battlePhase = 'boss_failed';
            next.bossTimeLeft = 0;
          } else {
            next.bossTimeLeft = newTime;
          }
        }

        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [bossTimeLimit]);

  // --------------------------------------------------------
  // フラッシュ解除
  // --------------------------------------------------------
  useEffect(() => {
    if (!state.screenFlash) return;
    const t = setTimeout(() => setState(p => ({ ...p, screenFlash: false })), 300);
    return () => clearTimeout(t);
  }, [state.screenFlash]);

  // --------------------------------------------------------
  // ボス警告 → ボス戦
  // --------------------------------------------------------
  useEffect(() => {
    if (state.battlePhase !== 'boss_warning') return;
    const t = setTimeout(() => {
      setState(prev => {
        if (prev.battlePhase !== 'boss_warning') return prev;
        const b = calcBuffs(prev.prestigeUpgrades);
        const limit = BOSS_TIME_BASE + b.bossTimeBonus;
        const nextStage = prev.stage + 1;
        return {
          ...prev,
          stage: nextStage,
          killCount: 0,
          enemy: createEnemy(nextStage, true),
          battlePhase: 'boss_battle',
          bossTimeLeft: limit,
        };
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [state.battlePhase]);

  // --------------------------------------------------------
  // stage_clear → 次ステージ
  // --------------------------------------------------------
  useEffect(() => {
    if (state.battlePhase !== 'stage_clear') return;
    const t = setTimeout(() => {
      setState(prev => {
        if (prev.battlePhase !== 'stage_clear') return prev;
        const nextStage = prev.stage + 1;
        const nextIsBoss = isBossStage(nextStage);
        return {
          ...prev,
          stage: nextStage,
          killCount: 0,
          enemy: createEnemy(nextStage, false),
          battlePhase: nextIsBoss ? 'boss_warning' : 'normal',
          bossTimeLeft: BOSS_TIME_BASE + calcBuffs(prev.prestigeUpgrades).bossTimeBonus,
          defeatStage: nextIsBoss ? prev.stage : prev.defeatStage,
        };
      });
    }, 800);
    return () => clearTimeout(t);
  }, [state.battlePhase]);

  // --------------------------------------------------------
  // クリック
  // --------------------------------------------------------
  const handleClick = useCallback((x: number, y: number) => {
    setState(prev => {
      const phase = prev.battlePhase;
      if (phase === 'boss_warning' || phase === 'boss_failed') return prev;

      const b = calcBuffs(prev.prestigeUpgrades);
      const damage = calcClickPower(prev.clickPower, b);
      const limit = BOSS_TIME_BASE + b.bossTimeBonus;

      const newFloating: FloatingTextItem = {
        id: floatingIdCounter++,
        text: `+${damage.toFixed(0)}`,
        x,
        y,
      };

      let next: GameState = {
        ...prev,
        floatingTexts: [...prev.floatingTexts, newFloating],
      };
      next = applyDamage(next, damage, b, limit);
      return next;
    });
  }, []);

  const removeFloatingText = useCallback((id: number) => {
    setState(prev => ({ ...prev, floatingTexts: prev.floatingTexts.filter(f => f.id !== id) }));
  }, []);

  // --------------------------------------------------------
  // 施設購入
  // --------------------------------------------------------
  const buyBuilding = useCallback((buildingId: string) => {
    setState(prev => {
      const idx = prev.buildings.findIndex(b => b.id === buildingId);
      if (idx === -1) return prev;
      const building = prev.buildings[idx];
      const cost = calcCost(building);
      if (prev.souls.lt(cost)) return prev;
      const newBuildings = [...prev.buildings];
      newBuildings[idx] = { ...building, count: building.count + 1 };
      return { ...prev, souls: prev.souls.sub(cost), buildings: newBuildings };
    });
  }, []);

  // --------------------------------------------------------
  // ボス再挑戦
  // --------------------------------------------------------
  const retryBoss = useCallback(() => {
    setState(prev => {
      if (prev.battlePhase !== 'boss_failed') return prev;
      return {
        ...prev,
        stage: prev.defeatStage,
        killCount: 0,
        enemy: createEnemy(prev.defeatStage, false),
        battlePhase: 'normal',
      };
    });
  }, []);

  // --------------------------------------------------------
  // タブ切り替え
  // --------------------------------------------------------
  const setTab = useCallback((tab: GameState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // --------------------------------------------------------
  // 転生確認ダイアログ
  // --------------------------------------------------------
  const openPrestigeConfirm = useCallback(() => {
    setState(prev => ({ ...prev, showPrestigeConfirm: true }));
  }, []);

  const closePrestigeConfirm = useCallback(() => {
    setState(prev => ({ ...prev, showPrestigeConfirm: false }));
  }, []);

  // --------------------------------------------------------
  // 転生実行
  // --------------------------------------------------------
  const executePrestige = useCallback(() => {
    setState(prev => {
      const b = calcBuffs(prev.prestigeUpgrades);
      const gained = calcCrystalGain(prev.totalSoulsEver, b.crystalMultiplier);
      const newCrystals = prev.crystals + gained;
      const limit = BOSS_TIME_BASE + b.bossTimeBonus;

      return {
        ...prev,
        // リセット
        souls: new Decimal(0),
        buildings: INITIAL_BUILDINGS,
        stage: 1,
        killCount: 0,
        enemy: createEnemy(1, false),
        battlePhase: 'normal',
        bossTimeLeft: limit,
        defeatStage: 1,
        floatingTexts: [],
        screenFlash: false,
        showPrestigeConfirm: false,
        // 維持・加算
        crystals: newCrystals,
        totalSoulsEver: prev.totalSoulsEver, // 累計は維持
        prestigeCount: prev.prestigeCount + 1,
        prestigeUpgrades: prev.prestigeUpgrades,
        // UI
        activeTab: 'main',
      };
    });
  }, []);

  // --------------------------------------------------------
  // 永続アップグレード購入
  // --------------------------------------------------------
  const buyPrestigeUpgrade = useCallback((upgradeId: string) => {
    setState(prev => {
      const idx = prev.prestigeUpgrades.findIndex(u => u.id === upgradeId);
      if (idx === -1) return prev;
      const upgrade = prev.prestigeUpgrades[idx];
      if (upgrade.level >= upgrade.maxLevel) return prev;
      const cost = calcUpgradeCost(upgrade);
      if (prev.crystals < cost) return prev;
      const newUpgrades = [...prev.prestigeUpgrades];
      newUpgrades[idx] = { ...upgrade, level: upgrade.level + 1 };
      return {
        ...prev,
        crystals: prev.crystals - cost,
        prestigeUpgrades: newUpgrades,
      };
    });
  }, []);

  return {
    state,
    buffs,
    totalSps,
    effectiveClickPower,
    bossTimeLimit,
    crystalPreview,
    handleClick,
    removeFloatingText,
    buyBuilding,
    retryBoss,
    setTab,
    openPrestigeConfirm,
    closePrestigeConfirm,
    executePrestige,
    buyPrestigeUpgrade,
  };
}

// ============================================================
// ダメージ適用（クリック・SPS共通）
// ============================================================
function applyDamage(
  prev: GameState,
  damage: Decimal,
  b: ReturnType<typeof calcBuffs>,
  bossTimeLimit: number,
): GameState {
  const newHp = prev.enemy.currentHp.sub(damage);
  if (!newHp.lte(0)) {
    return { ...prev, enemy: { ...prev.enemy, currentHp: newHp } };
  }

  // 敵撃破
  const reward = calcReward(prev.enemy.maxHp, b.totalMultiplier);
  const newKillCount = prev.killCount + 1;
  const souls = prev.souls.add(reward);
  const totalSoulsEver = prev.totalSoulsEver.add(reward);

  // ボス撃破
  if (prev.enemy.isBoss) {
    const nextStage = prev.stage + 1;
    const nextIsBoss = isBossStage(nextStage);
    return {
      ...prev, souls, totalSoulsEver,
      enemy: { ...prev.enemy, currentHp: new Decimal(0) },
      killCount: 1,
      screenFlash: true,
      battlePhase: nextIsBoss ? 'boss_warning' : 'stage_clear',
      bossTimeLeft: bossTimeLimit,
      defeatStage: nextIsBoss ? prev.stage : prev.defeatStage,
    };
  }

  // 雑魚撃破 → ステージクリア判定
  if (newKillCount >= KILLS_TO_NEXT) {
    const nextStage = prev.stage + 1;
    const nextIsBoss = isBossStage(nextStage);
    return {
      ...prev, souls, totalSoulsEver,
      enemy: { ...prev.enemy, currentHp: new Decimal(0) },
      killCount: newKillCount,
      screenFlash: true,
      battlePhase: nextIsBoss ? 'boss_warning' : 'stage_clear',
      bossTimeLeft: bossTimeLimit,
      defeatStage: nextIsBoss ? prev.stage : prev.defeatStage,
    };
  }

  // 次の雑魚へ
  return {
    ...prev, souls, totalSoulsEver,
    enemy: createEnemy(prev.stage, false),
    killCount: newKillCount,
    screenFlash: true,
  };
}