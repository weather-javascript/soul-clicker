import { useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { SoulDisplay } from './SoulDisplay';
import { ClickerButton } from './ClickerButton';
import { BuildingCard } from './BuildingCard';
import { FloatingText } from './FloatingText';

export function GameLayout() {
  const { state, totalSps, handleClick, removeFloatingText, buyBuilding } = useGameState();
  const clickerAreaRef = useRef<HTMLDivElement>(null);

  const handleClickAt = (x: number, y: number) => {
    // クリッカーエリア内の座標でフローティングテキストを表示
    if (clickerAreaRef.current) {
      const rect = clickerAreaRef.current.getBoundingClientRect();
      // 親(clicker-area)内のオフセット + ランダムX揺らし
      const randomOffsetX = (Math.random() - 0.5) * 60;
      handleClick(
        rect.width / 2 + randomOffsetX,
        rect.height / 2 - 20
      );
    } else {
      handleClick(x, y);
    }
  };

  return (
    <div className="game-root">
      {/* ヘッダー */}
      <header className="game-header">
        <h1 className="game-title">⚔️ SOUL HARVEST ⚔️</h1>
      </header>

      {/* メインコンテンツ */}
      <main className="game-main">

        {/* ソウル表示 */}
        <SoulDisplay
          souls={state.souls}
          totalSouls={state.totalSouls}
          sps={totalSps}
        />

        {/* クリッカーボタンエリア（フローティングテキスト含む） */}
        <div className="clicker-wrapper" ref={clickerAreaRef}>
          <ClickerButton onClickAt={handleClickAt} />

          {/* フローティングテキスト */}
          {state.floatingTexts.map(item => (
            <FloatingText
              key={item.id}
              item={item}
              onRemove={removeFloatingText}
            />
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