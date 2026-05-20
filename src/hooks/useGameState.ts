import { useState, useEffect, useRef, useCallback } from 'react';
import Decimal from 'decimal.js';
import type { GameState, Building, FloatingTextItem, Enemy, BattlePhase } from '../types/game';

const KILLS_TO_NEXT = 10;
const BOSS_TIME_LIMIT = 30;
const BOSS_INTERVAL = 5; // 5の倍数でボス

const INITIAL_BUILDINGS: Building[] = [
  {
    id: 'apprentice',
    name: '見習い剣士',
    emoji: '⚔️',
    baseCost: new Decimal(15),
    baseSps: new Decimal(1),
    count: 0,
    costMultiplier: new Decimal(1.15),
  },
  {
    id: 'dark_mage',
    name: '闇魔道士',
    emoji: '🧙',
    baseCost: new Decimal(100),
    baseSps: new Decimal(8),
    count: 0,
    costMultiplier: new Decimal(1.15),
  },
  {
    id: 'death_knight',
    name: 'デスナイト',
    emoji: '💀',
    baseCost: new Decimal(1100),
    baseSps: new Decimal(47),
    count: 0,
    costMultiplier: new Decimal(1.15),
  },
  {
    id: 'demon_lord',
    name: '魔王の眷属',
    emoji: '👿',
    baseCost: new Decimal(12000),
    baseSps: new Decimal(260),
    count: 0,
    costMultiplier: new Decimal(1.15),
  },
];

// 雑魚敵の最大HP: 10 * 1.4^(stage-1)
function calcEnemyHp(stage: number, isBoss: boolean): Decimal {
  const base = new Decimal(10).mul(new Decimal(1.4).pow(stage - 1));
  return isBoss ? base.mul(10) : base;
}

// 討伐報酬: maxHp * 0.2
function calcReward(maxHp: Decimal): Decimal {
  return maxHp.mul(0.2).ceil();
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

export function calcTotalSps(buildings: Building[]): Decimal {
  return buildings.reduce(
    (acc, b) => acc.add(b.baseSps.mul(b.count)),
    new Decimal(0)
  );
}

// ステージ名
export function getStageName(stage: number): string {
  const names: Record<number, string> = {
    1: '始まりの荒野',
    2: '枯れた森',
    3: '血塗れの峠',
    4: '亡者の洞窟',
    5: '炎の城門',
    6: '呪われた沼',
    7: '死霊の墓地',
    8: '魔の砂漠',
    9: '氷結の回廊',
    10: '冥府の玄関',
  };
  if (stage <= 10) return names[stage] ?? `深淵 ${stage}層`;
  if (stage <= 20) return `奈落 ${stage}層`;
  if (stage <= 50) return `混沌 ${stage}層`;
  return `虚無 ${stage}層`;
}

// 敵の名前
export function getEnemyName(stage: number, isBoss: boolean): string {
  if (isBoss) {
    const bosses = ['炎の番人', '影の王', '骸骨皇帝', '冥府の門番', '混沌の化身', '虚無の支配者'];
    return bosses[Math.floor((stage / BOSS_INTERVAL - 1) % bosses.length)] ?? 'UNKNOWN BOSS';
  }
  const enemies = ['ゴブリン', 'スケルトン', 'ゾンビ', 'ダークエルフ', 'リッチ', 'デーモン', 'ドラゴン'];
  return enemies[(stage - 1) % enemies.length] ?? '謎の敵';
}

let floatingIdCounter = 0;

function createInitialState(): GameState {
  return {
    souls: new Decimal(0),
    totalSouls: new Decimal(0),
    clickPower: new Decimal(1),
    buildings: INITIAL_BUILDINGS,
    floatingTexts: [],
    stage: 1,
    killCount: 0,
    killsToNext: KILLS_TO_NEXT,
    enemy: createEnemy(1, false),
    battlePhase: 'normal',
    bossTimeLeft: BOSS_TIME_LIMIT,
    defeatStage: 1,
    screenFlash: false,
  };
}

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // 敵にダメージを与える（クリック・SPS共通）
  const dealDamage = useCallback((damage: Decimal, setState: React.Dispatch<React.SetStateAction<GameState>>) => {
    setState(prev => {
      const phase = prev.battlePhase;
      if (phase === 'boss_warning' || phase === 'boss_failed' || phase === 'stage_clear') return prev;

      const newHp = prev.enemy.currentHp.sub(damage);

      if (newHp.lte(0)) {
        // 敵を倒した
        const reward = calcReward(prev.enemy.maxHp);
        const newKillCount = prev.killCount + 1;
        const defeated = { ...prev.enemy, currentHp: new Decimal(0) };

        // ステージクリア判定
        if (newKillCount >= KILLS_TO_NEXT) {
          const nextStage = prev.stage + 1;
          const nextIsBoss = isBossStage(nextStage);
          return {
            ...prev,
            souls: prev.souls.add(reward),
            totalSouls: prev.totalSouls.add(reward),
            enemy: defeated,
            killCount: newKillCount,
            screenFlash: true,
            battlePhase: nextIsBoss ? 'boss_warning' : 'stage_clear',
            bossTimeLeft: BOSS_TIME_LIMIT,
            defeatStage: nextIsBoss ? prev.stage : prev.defeatStage,
          };
        }

        // 次の雑魚へ
        return {
          ...prev,
          souls: prev.souls.add(reward),
          totalSouls: prev.totalSouls.add(reward),
          enemy: createEnemy(prev.stage, false),
          killCount: newKillCount,
          screenFlash: true,
        };
      }

      return {
        ...prev,
        enemy: { ...prev.enemy, currentHp: newHp },
      };
    });
  }, []);

  // SPSによる自動ダメージ + ボスタイマー（1秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const phase = prev.battlePhase;
        let next = { ...prev };

        // SPS加算（常時）
        const sps = calcTotalSps(prev.buildings);
        next.souls = prev.souls.add(sps);
        next.totalSouls = prev.totalSouls.add(sps);

        // ボス警告中・敗北中・クリア演出中は戦闘処理スキップ
        if (phase === 'boss_warning' || phase === 'boss_failed' || phase === 'stage_clear') return next;

        // SPSダメージ
        if (sps.gt(0)) {
          const newHp = prev.enemy.currentHp.sub(sps);
          if (newHp.lte(0)) {
            const reward = calcReward(prev.enemy.maxHp);
            const newKillCount = prev.killCount + 1;
            next.souls = next.souls.add(reward);
            next.totalSouls = next.totalSouls.add(reward);
            next.screenFlash = true;

            if (newKillCount >= KILLS_TO_NEXT) {
              const nextStage = prev.stage + 1;
              const nextIsBoss = isBossStage(nextStage);
              next.killCount = newKillCount;
              next.enemy = { ...prev.enemy, currentHp: new Decimal(0) };
              next.battlePhase = nextIsBoss ? 'boss_warning' : 'stage_clear';
              next.bossTimeLeft = BOSS_TIME_LIMIT;
              next.defeatStage = nextIsBoss ? prev.stage : prev.defeatStage;
            } else {
              next.killCount = newKillCount;
              next.enemy = createEnemy(prev.stage, false);
            }
          } else {
            next.enemy = { ...prev.enemy, currentHp: newHp };
          }
        }

        // ボスタイマー
        if (phase === 'boss_battle') {
          const newTime = prev.bossTimeLeft - 1;
          if (newTime <= 0) {
            // ボス敗北
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
  }, []);

  // フラッシュを自動解除
  useEffect(() => {
    if (!state.screenFlash) return;
    const t = setTimeout(() => setState(p => ({ ...p, screenFlash: false })), 300);
    return () => clearTimeout(t);
  }, [state.screenFlash]);

  // ボス警告 → ボス戦へ自動移行（2秒）
  useEffect(() => {
    if (state.battlePhase !== 'boss_warning') return;
    const t = setTimeout(() => {
      setState(prev => {
        if (prev.battlePhase !== 'boss_warning') return prev;
        const nextStage = prev.stage + 1;
        return {
          ...prev,
          stage: nextStage,
          killCount: 0,
          enemy: createEnemy(nextStage, true),
          battlePhase: 'boss_battle',
          bossTimeLeft: BOSS_TIME_LIMIT,
        };
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [state.battlePhase]);

  // stage_clear → 次ステージへ自動移行（1秒）
  useEffect(() => {
    if (state.battlePhase !== 'stage_clear') return;
    const t = setTimeout(() => {
      setState(prev => {
        if (prev.battlePhase !== 'stage_clear') return prev;
        const nextStage = prev.stage + 1;
        return {
          ...prev,
          stage: nextStage,
          killCount: 0,
          enemy: createEnemy(nextStage, false),
          battlePhase: 'normal',
        };
      });
    }, 800);
    return () => clearTimeout(t);
  }, [state.battlePhase]);

  // クリック処理
  const handleClick = useCallback((x: number, y: number) => {
    setState(prev => {
      const phase = prev.battlePhase;
      if (phase === 'boss_warning' || phase === 'boss_failed') return prev;

      const gain = prev.clickPower;
      const newFloating: FloatingTextItem = {
        id: floatingIdCounter++,
        text: `+${gain.toFixed(0)}`,
        x,
        y,
      };
      return {
        ...prev,
        floatingTexts: [...prev.floatingTexts, newFloating],
      };
    });

    // ダメージ処理（setState内でdealDamageを呼ぶとネストするので別途）
    setState(prev => {
      const phase = prev.battlePhase;
      if (phase === 'boss_warning' || phase === 'boss_failed') return prev;
      const damage = prev.clickPower;
      const newHp = prev.enemy.currentHp.sub(damage);

      if (newHp.lte(0)) {
        const reward = calcReward(prev.enemy.maxHp);
        const newKillCount = prev.killCount + 1;

        if (prev.enemy.isBoss) {
          // ボス討伐
          const nextStage = prev.stage + 1;
          const nextIsBoss = isBossStage(nextStage);
          return {
            ...prev,
            souls: prev.souls.add(reward),
            totalSouls: prev.totalSouls.add(reward),
            enemy: { ...prev.enemy, currentHp: new Decimal(0) },
            killCount: newKillCount,
            screenFlash: true,
            battlePhase: nextIsBoss ? 'boss_warning' : 'stage_clear',
            bossTimeLeft: BOSS_TIME_LIMIT,
            defeatStage: nextIsBoss ? prev.stage : prev.defeatStage,
          };
        }

        if (newKillCount >= KILLS_TO_NEXT) {
          const nextStage = prev.stage + 1;
          const nextIsBoss = isBossStage(nextStage);
          return {
            ...prev,
            souls: prev.souls.add(reward),
            totalSouls: prev.totalSouls.add(reward),
            enemy: { ...prev.enemy, currentHp: new Decimal(0) },
            killCount: newKillCount,
            screenFlash: true,
            battlePhase: nextIsBoss ? 'boss_warning' : 'stage_clear',
            bossTimeLeft: BOSS_TIME_LIMIT,
            defeatStage: nextIsBoss ? prev.stage : prev.defeatStage,
          };
        }

        return {
          ...prev,
          souls: prev.souls.add(reward),
          totalSouls: prev.totalSouls.add(reward),
          enemy: createEnemy(prev.stage, false),
          killCount: newKillCount,
          screenFlash: true,
        };
      }

      return {
        ...prev,
        souls: prev.souls.add(prev.clickPower),
        totalSouls: prev.totalSouls.add(prev.clickPower),
        enemy: { ...prev.enemy, currentHp: newHp },
      };
    });
  }, [dealDamage]);

  const removeFloatingText = useCallback((id: number) => {
    setState(prev => ({
      ...prev,
      floatingTexts: prev.floatingTexts.filter(f => f.id !== id),
    }));
  }, []);

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

  // ボス再挑戦
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

  const totalSps = calcTotalSps(state.buildings);

  return {
    state,
    totalSps,
    handleClick,
    removeFloatingText,
    buyBuilding,
    retryBoss,
  };
}