import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Decimal from 'decimal.js';
import type { GameState, Building, PrestigeUpgrade, Enemy } from '../types/game';

// ============================================================
// ユーザーID管理（LocalStorage）
// ============================================================
export function getOrCreateUserId(): string {
  const key = 'soul_clicker_uid';
  let uid = localStorage.getItem(key);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(key, uid);
  }
  return uid;
}

// ============================================================
// シリアライズ（GameState → JSON保存用オブジェクト）
// ============================================================
export function serializeState(state: GameState): object {
  return {
    souls:          state.souls.toString(),
    totalSoulsEver: state.totalSoulsEver.toString(),
    clickPower:     state.clickPower.toString(),
    stage:          state.stage,
    killCount:      state.killCount,
    crystals:       state.crystals,
    prestigeCount:  state.prestigeCount,
    lastSaveTime:   Date.now(),
    buildings: state.buildings.map(b => ({
      id:    b.id,
      count: b.count,
    })),
    prestigeUpgrades: state.prestigeUpgrades.map(u => ({
      id:    u.id,
      level: u.level,
    })),
    enemy: {
      currentHp: state.enemy.currentHp.toString(),
      maxHp:     state.enemy.maxHp.toString(),
      isBoss:    state.enemy.isBoss,
    },
    bossTimeLeft: state.bossTimeLeft,
    defeatStage:  state.defeatStage,
    battlePhase:  state.battlePhase === 'boss_warning' ? 'normal' : state.battlePhase,
  };
}

// ============================================================
// デシリアライズ（JSON → 部分的なGameState復元データ）
// ============================================================
export interface RestoredData {
  souls: Decimal;
  totalSoulsEver: Decimal;
  clickPower: Decimal;
  stage: number;
  killCount: number;
  crystals: number;
  prestigeCount: number;
  lastSaveTime: number;
  buildingCounts: Record<string, number>;
  upgradeLevels: Record<string, number>;
  enemy: Enemy;
  bossTimeLeft: number;
  defeatStage: number;
  battlePhase: GameState['battlePhase'];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deserializeData(data: any): RestoredData {
  const buildingCounts: Record<string, number> = {};
  if (Array.isArray(data.buildings)) {
    for (const b of data.buildings) buildingCounts[b.id] = b.count ?? 0;
  }

  const upgradeLevels: Record<string, number> = {};
  if (Array.isArray(data.prestigeUpgrades)) {
    for (const u of data.prestigeUpgrades) upgradeLevels[u.id] = u.level ?? 0;
  }

  const enemy: Enemy = {
    currentHp: new Decimal(data.enemy?.currentHp ?? '10'),
    maxHp:     new Decimal(data.enemy?.maxHp     ?? '10'),
    isBoss:    data.enemy?.isBoss ?? false,
  };

  return {
    souls:          new Decimal(data.souls          ?? '0'),
    totalSoulsEver: new Decimal(data.totalSoulsEver ?? '0'),
    clickPower:     new Decimal(data.clickPower     ?? '1'),
    stage:          Number(data.stage       ?? 1),
    killCount:      Number(data.killCount   ?? 0),
    crystals:       Number(data.crystals    ?? 0),
    prestigeCount:  Number(data.prestigeCount ?? 0),
    lastSaveTime:   Number(data.lastSaveTime  ?? Date.now()),
    buildingCounts,
    upgradeLevels,
    enemy,
    bossTimeLeft:  Number(data.bossTimeLeft ?? 30),
    defeatStage:   Number(data.defeatStage  ?? 1),
    battlePhase:   data.battlePhase ?? 'normal',
  };
}

// ============================================================
// Firebase 保存
// ============================================================
export async function saveToFirebase(state: GameState, userId: string): Promise<void> {
  const data = serializeState(state);
  await setDoc(doc(db, 'saves', userId), data);
}

// ============================================================
// Firebase 読み込み
// ============================================================
export async function loadFromFirebase(userId: string): Promise<RestoredData | null> {
  const snap = await getDoc(doc(db, 'saves', userId));
  if (!snap.exists()) return null;
  return deserializeData(snap.data());
}