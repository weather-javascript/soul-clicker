import { useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { SoulDisplay } from './SoulDisplay';
import { ClickerButton } from './ClickerButton';
import { BuildingCard } from './BuildingCard';
import { FloatingText } from './FloatingText';
import { StageHeader } from './StageHeader';
import { EnemyArea } from './EnemyArea';
import { BossWarning } from './BossWarning';

export function GameLayout() {
  const { state, totalSps, handleClick, removeFloatingText, buyBuilding, retryBoss } = useGameState();
  const clickerAreaRef = useRef<HTMLDivElement>(null);

  const handleClickAt = (_x: number, _y: number) => {
    if (clickerAreaRef.current) {
      const rect = clickerAreaRef.current.getBoundingClientRect();
      const randomOffsetX = (Math.random() - 0.5) * 60;
      handleClick(rect.width / 2 + randomOffsetX, rect.height / 2 - 20);
    }
  };

  const isBossPhase =
    state.battlePhase === 'boss_battle' ||
    state.battlePhase === 'boss_warning' ||
    state.battlePhase === 'boss_failed';

  return (
    <div className={`game-root ${state.screenFlash ? 'screen-flash' : ''} ${isBossPhase ? 'boss-atmosphere' : ''}`}>
      {/* ボス警告・敗北オーバーレイ */}
      <BossWarning
        battlePhase={state.battlePhase}
        onRetry={retryBoss}
        bossStage={state.defeatStage}
      />

      {/* ヘッダー */}
      <header className="game-header">
        <h1 className="game-title">⚔️ SOUL HARVEST ⚔️</h1>
      </header>

      <main className="game-main">
        {/* ステージヘッダー */}
        <StageHeader
          stage={state.stage}
          killCount={state.killCount}
          killsToNext={state.killsToNext}
          battlePhase={state.battlePhase}
          bossTimeLeft={state.bossTimeLeft}
        />

        {/* ソウル表示 */}
        <SoulDisplay
          souls={state.souls}
          totalSouls={state.totalSouls}
          sps={totalSps}
        />

        {/* 敵エリア */}
        <EnemyArea
          enemy={state.enemy}
          stage={state.stage}
          battlePhase={state.battlePhase}
        />

        {/* クリッカーボタン */}
        <div className="clicker-wrapper" ref={clickerAreaRef}>
          <ClickerButton onClickAt={handleClickAt} />
          {state.floatingTexts.map(item => (
            <FloatingText key={item.id} item={item} onRemove={removeFloatingText} />
          ))}
        </div>

        {/* 施設リスト */}
        <section className="buildings-section">
          <h2 className="section-title">🏰 施設</h2>
          <div className="buildings-list">
            {state.buildings.map(building => (
              <BuildingCard
                key={building.id}
                building={building}
                currentSouls={state.souls}
                onBuy={buyBuilding}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}