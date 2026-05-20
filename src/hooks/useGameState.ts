import { useState, useEffect, useCallback, useRef } from 'react';
import Decimal from 'decimal.js';
import type {
  GameState, Building, FloatingTextItem,
  Enemy, PrestigeUpgrade,
} from '../types/game';
import {
  getOrCreateUserId, saveToFirebase,
  loadFromFirebase, type RestoredData,
} from './useSaveLoad';

// ============================================================
// 定数
// ============================================================
const KILLS_TO_NEXT  = 10;
const BOSS_TIME_BASE = 30;
const BOSS_INTERVAL  = 5;
const CRIT_CHANCE    = 0.05;   // 5%
const CRIT_MULTIPLIER = 10;
const OFFLINE_RATE   = 0.5;    // オフライン収益率50%
const MAX_OFFLINE_SEC = 86400; // 最大24時間

const INITIAL_BUILDINGS: Building[] = [
  { id:'apprentice',   name:'見習い剣士',  emoji:'⚔️',  baseCost:new Decimal(15),    baseSps:new Decimal(1),    count:0, costMultiplier:new Decimal(1.15) },
  { id:'dark_mage',    name:'闇魔道士',    emoji:'🧙',  baseCost:new Decimal(100),   baseSps:new Decimal(8),    count:0, costMultiplier:new Decimal(1.15) },
  { id:'death_knight', name:'デスナイト',  emoji:'💀',  baseCost:new Decimal(1100),  baseSps:new Decimal(47),   count:0, costMultiplier:new Decimal(1.15) },
  { id:'demon_lord',   name:'魔王の眷属',  emoji:'👿',  baseCost:new Decimal(12000), baseSps:new Decimal(260),  count:0, costMultiplier:new Decimal(1.15) },
  { id:'lich_king',    name:'リッチキング',emoji:'🦴',  baseCost:new Decimal(130000),baseSps:new Decimal(1400), count:0, costMultiplier:new Decimal(1.15) },
];

const INITIAL_PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  { id:'soul_vessel',  name:'魂の器',    emoji:'🔮', description:'全ソウル生産量（クリック＆SPS）が +50%（乗算）', baseCost:1, level:0, maxLevel:20 },
  { id:'divine_speed', name:'神速の加護',emoji:'⚡', description:'クリック攻撃力のみ +100%（乗算）',              baseCost:2, level:0, maxLevel:15 },
  { id:'time_warp',    name:'時空の歪み',emoji:'⏳', description:'ボス戦の制限時間 +5秒',                        baseCost:3, level:0, maxLevel:10 },
  { id:'crystal_heart',name:'結晶の心臓',emoji:'💎', description:'転生時の結晶獲得量 +20%（乗算）',              baseCost:5, level:0, maxLevel:10 },
];

// ============================================================
// ヘルパー
// ============================================================
export interface Buffs {
  totalMultiplier: Decimal;
  clickMultiplier: Decimal;
  bossTimeBonus: number;
  crystalMultiplier: Decimal;
}

export function calcBuffs(upgrades: PrestigeUpgrade[]): Buffs {
  let tm = new Decimal(1), cm = new Decimal(1), bt = 0, crm = new Decimal(1);
  for (const u of upgrades) {
    if (u.level === 0) continue;
    if (u.id === 'soul_vessel')   tm  = tm.mul(new Decimal(1.5).pow(u.level));
    if (u.id === 'divine_speed')  cm  = cm.mul(new Decimal(2).pow(u.level));
    if (u.id === 'time_warp')     bt += u.level * 5;
    if (u.id === 'crystal_heart') crm = crm.mul(new Decimal(1.2).pow(u.level));
  }
  return { totalMultiplier:tm, clickMultiplier:cm, bossTimeBonus:bt, crystalMultiplier:crm };
}

export function calcCrystalGain(totalSoulsEver: Decimal, crystalMul: Decimal): number {
  return totalSoulsEver.div(1e9).sqrt().floor().mul(crystalMul).floor().toNumber();
}

export function calcUpgradeCost(u: PrestigeUpgrade): number {
  return u.baseCost * (u.level + 1);
}

function calcEnemyHp(stage: number, isBoss: boolean): Decimal {
  const base = new Decimal(10).mul(new Decimal(1.4).pow(stage - 1));
  return isBoss ? base.mul(10) : base;
}

function calcReward(maxHp: Decimal, tm: Decimal): Decimal {
  return maxHp.mul(0.2).mul(tm).ceil();
}

function isBossStage(s: number): boolean { return s % BOSS_INTERVAL === 0; }

function createEnemy(stage: number, isBoss: boolean): Enemy {
  const maxHp = calcEnemyHp(stage, isBoss);
  return { currentHp: maxHp, maxHp, isBoss };
}

export function calcCost(b: Building): Decimal {
  return b.baseCost.mul(b.costMultiplier.pow(b.count));
}

export function calcTotalSps(buildings: Building[], buffs: Buffs): Decimal {
  return buildings.reduce((a, b) => a.add(b.baseSps.mul(b.count)), new Decimal(0)).mul(buffs.totalMultiplier);
}

export function calcClickPower(base: Decimal, buffs: Buffs): Decimal {
  return base.mul(buffs.totalMultiplier).mul(buffs.clickMultiplier);
}

export function getStageName(stage: number): string {
  const n: Record<number,string> = {1:'始まりの荒野',2:'枯れた森',3:'血塗れの峠',4:'亡者の洞窟',5:'炎の城門',6:'呪われた沼',7:'死霊の墓地',8:'魔の砂漠',9:'氷結の回廊'};
  return n[stage] ?? (stage<=20?`冥府 ${stage}層`:stage<=50?`混沌 ${stage}層`:`虚無 ${stage}層`);
}

export function getEnemyName(stage: number, isBoss: boolean): string {
  if (isBoss) { const b=['炎の番人','影の王','骸骨皇帝','冥府の門番','混沌の化身','虚無の支配者']; return b[Math.floor((stage/BOSS_INTERVAL-1)%b.length)]; }
  const e=['ゴブリン','スケルトン','ゾンビ','ダークエルフ','リッチ','デーモン','ドラゴン'];
  return e[(stage-1)%e.length];
}

// ============================================================
// ダメージ適用
// ============================================================
function applyDamage(prev: GameState, damage: Decimal, b: Buffs, bossTimeLimit: number): GameState {
  const newHp = prev.enemy.currentHp.sub(damage);
  if (!newHp.lte(0)) return { ...prev, enemy: { ...prev.enemy, currentHp: newHp } };

  const reward = calcReward(prev.enemy.maxHp, b.totalMultiplier);
  const newKillCount = prev.killCount + 1;
  const souls = prev.souls.add(reward);
  const totalSoulsEver = prev.totalSoulsEver.add(reward);

  if (prev.enemy.isBoss) {
    const ns = prev.stage + 1;
    const nb = isBossStage(ns);
    return { ...prev, souls, totalSoulsEver, enemy:{...prev.enemy,currentHp:new Decimal(0)}, killCount:1, screenFlash:true, showStageClear:true, battlePhase:nb?'boss_warning':'stage_clear', bossTimeLeft:bossTimeLimit, defeatStage:nb?prev.stage:prev.defeatStage };
  }

  if (newKillCount >= KILLS_TO_NEXT) {
    const ns = prev.stage + 1;
    const nb = isBossStage(ns);
    return { ...prev, souls, totalSoulsEver, enemy:{...prev.enemy,currentHp:new Decimal(0)}, killCount:newKillCount, screenFlash:true, showStageClear:true, battlePhase:nb?'boss_warning':'stage_clear', bossTimeLeft:bossTimeLimit, defeatStage:nb?prev.stage:prev.defeatStage };
  }

  return { ...prev, souls, totalSoulsEver, enemy:createEnemy(prev.stage,false), killCount:newKillCount, screenFlash:true };
}

// ============================================================
// 初期State
// ============================================================
let fltId = 0;

function createInitialState(): GameState {
  return {
    souls: new Decimal(0), totalSoulsEver: new Decimal(0), clickPower: new Decimal(1),
    buildings: INITIAL_BUILDINGS, floatingTexts: [],
    stage:1, killCount:0, killsToNext:KILLS_TO_NEXT,
    enemy: createEnemy(1,false), battlePhase:'normal',
    bossTimeLeft: BOSS_TIME_BASE, defeatStage:1, screenFlash:false,
    crystals:0, prestigeUpgrades: INITIAL_PRESTIGE_UPGRADES, prestigeCount:0,
    activeTab:'main', showPrestigeConfirm:false, showStageClear:false,
    lastSaveTime: Date.now(),
  };
}

// セーブデータをGameStateにマージ
function mergeRestoredData(base: GameState, d: RestoredData): GameState {
  const buildings = base.buildings.map(b => ({
    ...b, count: d.buildingCounts[b.id] ?? 0,
  }));
  const prestigeUpgrades = base.prestigeUpgrades.map(u => ({
    ...u, level: d.upgradeLevels[u.id] ?? 0,
  }));
  return {
    ...base,
    souls: d.souls, totalSoulsEver: d.totalSoulsEver, clickPower: d.clickPower,
    stage: d.stage, killCount: d.killCount, crystals: d.crystals,
    prestigeCount: d.prestigeCount, lastSaveTime: d.lastSaveTime,
    buildings, prestigeUpgrades,
    enemy: d.enemy, bossTimeLeft: d.bossTimeLeft,
    defeatStage: d.defeatStage, battlePhase: d.battlePhase,
  };
}

// ============================================================
// オフライン収益計算
// ============================================================
export interface OfflineBonus { seconds: number; souls: Decimal; }

function calcOfflineBonus(lastSaveTime: number, sps: Decimal): OfflineBonus | null {
  const elapsed = Math.floor((Date.now() - lastSaveTime) / 1000);
  if (elapsed < 60) return null; // 1分未満は無視
  const seconds = Math.min(elapsed, MAX_OFFLINE_SEC);
  const souls = sps.mul(seconds).mul(OFFLINE_RATE).ceil();
  if (souls.lte(0)) return null;
  return { seconds, souls };
}

// ============================================================
// メインフック
// ============================================================
export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [offlineBonus, setOfflineBonus] = useState<OfflineBonus | null>(null);
  const userId = useRef(getOrCreateUserId());

  const buffs = calcBuffs(state.prestigeUpgrades);
  const totalSps = calcTotalSps(state.buildings, buffs);
  const effectiveClickPower = calcClickPower(state.clickPower, buffs);
  const bossTimeLimit = BOSS_TIME_BASE + buffs.bossTimeBonus;
  const crystalPreview = calcCrystalGain(state.totalSoulsEver, buffs.crystalMultiplier);

  // --------------------------------------------------------
  // 起動時：Firebaseからロード
  // --------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const data = await loadFromFirebase(userId.current);
        if (!data) return;
        const base = createInitialState();
        const merged = mergeRestoredData(base, data);
        // オフライン収益計算（ロード前のSPSで計算）
        const b = calcBuffs(merged.prestigeUpgrades);
        const sps = calcTotalSps(merged.buildings, b);
        const bonus = calcOfflineBonus(data.lastSaveTime, sps);
        if (bonus) {
          merged.souls = merged.souls.add(bonus.souls);
          merged.totalSoulsEver = merged.totalSoulsEver.add(bonus.souls);
          setOfflineBonus(bonus);
        }
        setState(merged);
      } catch (e) {
        console.warn('ロード失敗:', e);
      }
    })();
  }, []);

  // --------------------------------------------------------
  // 自動セーブ（30秒ごと）
  // --------------------------------------------------------
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await saveToFirebase(stateRef.current, userId.current);
        setState(p => ({ ...p, lastSaveTime: Date.now() }));
      } catch (e) { console.warn('自動セーブ失敗:', e); }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------------
  // ゲームループ
  // --------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const b = calcBuffs(prev.prestigeUpgrades);
        const sps = calcTotalSps(prev.buildings, b);
        const phase = prev.battlePhase;
        let next = { ...prev, souls: prev.souls.add(sps), totalSoulsEver: prev.totalSoulsEver.add(sps) };

        if (phase === 'boss_warning' || phase === 'boss_failed' || phase === 'stage_clear') return next;

        if (sps.gt(0)) next = applyDamage(next, sps, b, bossTimeLimit);

        if (phase === 'boss_battle') {
          const t = prev.bossTimeLeft - 1;
          next.bossTimeLeft = t <= 0 ? 0 : t;
          if (t <= 0) next.battlePhase = 'boss_failed';
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [bossTimeLimit]);

  // フラッシュ解除
  useEffect(() => {
    if (!state.screenFlash) return;
    const t = setTimeout(() => setState(p => ({ ...p, screenFlash:false })), 300);
    return () => clearTimeout(t);
  }, [state.screenFlash]);

  // ステージクリアバナー解除
  useEffect(() => {
    if (!state.showStageClear) return;
    const t = setTimeout(() => setState(p => ({ ...p, showStageClear:false })), 2000);
    return () => clearTimeout(t);
  }, [state.showStageClear]);

  // ボス警告 → ボス戦
  useEffect(() => {
    if (state.battlePhase !== 'boss_warning') return;
    const t = setTimeout(() => {
      setState(prev => {
        if (prev.battlePhase !== 'boss_warning') return prev;
        const b = calcBuffs(prev.prestigeUpgrades);
        const ns = prev.stage + 1;
        return { ...prev, stage:ns, killCount:0, enemy:createEnemy(ns,true), battlePhase:'boss_battle', bossTimeLeft:BOSS_TIME_BASE+b.bossTimeBonus };
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [state.battlePhase]);

  // stage_clear → 次ステージ
  useEffect(() => {
    if (state.battlePhase !== 'stage_clear') return;
    const t = setTimeout(() => {
      setState(prev => {
        if (prev.battlePhase !== 'stage_clear') return prev;
        const ns = prev.stage + 1;
        const nb = isBossStage(ns);
        const b = calcBuffs(prev.prestigeUpgrades);
        return { ...prev, stage:ns, killCount:0, enemy:createEnemy(ns,false), battlePhase:nb?'boss_warning':'normal', bossTimeLeft:BOSS_TIME_BASE+b.bossTimeBonus, defeatStage:nb?prev.stage:prev.defeatStage };
      });
    }, 800);
    return () => clearTimeout(t);
  }, [state.battlePhase]);

  // --------------------------------------------------------
  // クリック（クリティカル対応）
  // --------------------------------------------------------
  const handleClick = useCallback((x: number, y: number) => {
    setState(prev => {
      const phase = prev.battlePhase;
      if (phase === 'boss_warning' || phase === 'boss_failed') return prev;
      const b = calcBuffs(prev.prestigeUpgrades);
      const base = calcClickPower(prev.clickPower, b);
      const isCrit = Math.random() < CRIT_CHANCE;
      const damage = isCrit ? base.mul(CRIT_MULTIPLIER) : base;
      const limit = BOSS_TIME_BASE + b.bossTimeBonus;

      const ft: FloatingTextItem = {
        id: fltId++,
        text: isCrit ? `💥CRITICAL! +${damage.toFixed(0)}` : `+${damage.toFixed(0)}`,
        x, y,
        isCritical: isCrit,
      };

      let next: GameState = { ...prev, floatingTexts: [...prev.floatingTexts, ft] };
      next = applyDamage(next, damage, b, limit);
      return next;
    });
  }, []);

  const removeFloatingText = useCallback((id: number) => {
    setState(prev => ({ ...prev, floatingTexts: prev.floatingTexts.filter(f => f.id !== id) }));
  }, []);

  // 施設購入
  const buyBuilding = useCallback((id: string) => {
    setState(prev => {
      const idx = prev.buildings.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const cost = calcCost(prev.buildings[idx]);
      if (prev.souls.lt(cost)) return prev;
      const nb = [...prev.buildings];
      nb[idx] = { ...nb[idx], count: nb[idx].count + 1 };
      return { ...prev, souls: prev.souls.sub(cost), buildings: nb };
    });
  }, []);

  // ボス再挑戦
  const retryBoss = useCallback(() => {
    setState(prev => {
      if (prev.battlePhase !== 'boss_failed') return prev;
      return { ...prev, stage:prev.defeatStage, killCount:0, enemy:createEnemy(prev.defeatStage,false), battlePhase:'normal' };
    });
  }, []);

  // タブ
  const setTab = useCallback((tab: GameState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // 転生確認
  const openPrestigeConfirm  = useCallback(() => setState(p => ({ ...p, showPrestigeConfirm:true  })), []);
  const closePrestigeConfirm = useCallback(() => setState(p => ({ ...p, showPrestigeConfirm:false })), []);

  // 転生実行
  const executePrestige = useCallback(() => {
    setState(prev => {
      const b = calcBuffs(prev.prestigeUpgrades);
      const gained = calcCrystalGain(prev.totalSoulsEver, b.crystalMultiplier);
      return {
        ...prev,
        souls: new Decimal(0), buildings: INITIAL_BUILDINGS,
        stage:1, killCount:0, enemy:createEnemy(1,false),
        battlePhase:'normal', bossTimeLeft:BOSS_TIME_BASE+b.bossTimeBonus,
        defeatStage:1, floatingTexts:[], screenFlash:false,
        showPrestigeConfirm:false, showStageClear:false,
        crystals: prev.crystals + gained,
        totalSoulsEver: prev.totalSoulsEver,
        prestigeCount: prev.prestigeCount + 1,
        prestigeUpgrades: prev.prestigeUpgrades,
        activeTab:'main', lastSaveTime: Date.now(),
      };
    });
  }, []);

  // 永続アップグレード購入
  const buyPrestigeUpgrade = useCallback((id: string) => {
    setState(prev => {
      const idx = prev.prestigeUpgrades.findIndex(u => u.id === id);
      if (idx < 0) return prev;
      const u = prev.prestigeUpgrades[idx];
      if (u.level >= u.maxLevel) return prev;
      const cost = calcUpgradeCost(u);
      if (prev.crystals < cost) return prev;
      const nu = [...prev.prestigeUpgrades];
      nu[idx] = { ...u, level: u.level + 1 };
      return { ...prev, crystals: prev.crystals - cost, prestigeUpgrades: nu };
    });
  }, []);

  // 手動セーブ
  const manualSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await saveToFirebase(stateRef.current, userId.current);
      setState(p => ({ ...p, lastSaveTime: Date.now() }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); }
  }, []);

  // 手動ロード
  const manualLoad = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const data = await loadFromFirebase(userId.current);
      if (!data) { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); return; }
      const merged = mergeRestoredData(createInitialState(), data);
      setState(merged);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000); }
  }, []);

  // 全リセット
  const hardReset = useCallback(() => {
    if (!window.confirm('本当に全データを初期化しますか？この操作は取り消せません。')) return;
    setState(createInitialState());
  }, []);

  // オフラインボーナス承認
  const acceptOfflineBonus = useCallback(() => setOfflineBonus(null), []);

  return {
    state, buffs, totalSps, effectiveClickPower, bossTimeLimit,
    crystalPreview, saveStatus, offlineBonus, userId: userId.current,
    handleClick, removeFloatingText, buyBuilding, retryBoss,
    setTab, openPrestigeConfirm, closePrestigeConfirm,
    executePrestige, buyPrestigeUpgrade,
    manualSave, manualLoad, hardReset, acceptOfflineBonus,
  };
}