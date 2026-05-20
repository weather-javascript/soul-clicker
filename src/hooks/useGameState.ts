import { useState, useEffect, useRef, useCallback } from 'react';
import Decimal from 'decimal.js';
import type { GameState, Building, FloatingTextItem } from '../types/game';
// 初期施設定義
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

// 施設の現在コストを計算
export function calcCost(building: Building): Decimal {
  // nextCost = baseCost * (1.15 ^ count)
  return building.baseCost.mul(building.costMultiplier.pow(building.count));
}

// 施設の総SPS貢献を計算
function calcBuildingSps(building: Building): Decimal {
  return building.baseSps.mul(building.count);
}

// 全施設のSPS合計
function calcTotalSps(buildings: Building[]): Decimal {
  return buildings.reduce(
    (acc, b) => acc.add(calcBuildingSps(b)),
    new Decimal(0)
  );
}

let floatingIdCounter = 0;

export function useGameState() {
  const [state, setState] = useState<GameState>({
    souls: new Decimal(0),
    totalSouls: new Decimal(0),
    clickPower: new Decimal(1),
    buildings: INITIAL_BUILDINGS,
    floatingTexts: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // ゲームループ（1秒ごとにSPS加算）
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const sps = calcTotalSps(prev.buildings);
        if (sps.eq(0)) return prev;
        return {
          ...prev,
          souls: prev.souls.add(sps),
          totalSouls: prev.totalSouls.add(sps),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // クリック処理
  const handleClick = useCallback((x: number, y: number) => {
    setState(prev => {
      const gain = prev.clickPower;
      const newFloating: FloatingTextItem = {
        id: floatingIdCounter++,
        text: `+${gain.toFixed(0)}`,
        x,
        y,
      };

      return {
        ...prev,
        souls: prev.souls.add(gain),
        totalSouls: prev.totalSouls.add(gain),
        floatingTexts: [...prev.floatingTexts, newFloating],
      };
    });
  }, []);

  // フローティングテキストの削除
  const removeFloatingText = useCallback((id: number) => {
    setState(prev => ({
      ...prev,
      floatingTexts: prev.floatingTexts.filter(f => f.id !== id),
    }));
  }, []);

  // 施設購入
  const buyBuilding = useCallback((buildingId: string) => {
    setState(prev => {
      const buildingIndex = prev.buildings.findIndex(b => b.id === buildingId);
      if (buildingIndex === -1) return prev;

      const building = prev.buildings[buildingIndex];
      const cost = calcCost(building);

      if (prev.souls.lt(cost)) return prev; // 所持ソウルが足りない

      const updatedBuilding: Building = {
        ...building,
        count: building.count + 1,
      };

      const newBuildings = [...prev.buildings];
      newBuildings[buildingIndex] = updatedBuilding;

      return {
        ...prev,
        souls: prev.souls.sub(cost),
        buildings: newBuildings,
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
  };
}