import { useRef } from 'react';
import { useGameState } from '../hooks/useGameState';
import { SoulDisplay } from './SoulDisplay';
import { ClickerButton } from './ClickerButton';
import { BuildingCard } from './BuildingCard';
import { FloatingText } from './FloatingText';
import { StageHeader } from './StageHeader';
import { EnemyArea } from './EnemyArea';
import { BossWarning } from './BossWarning';
import { PrestigeTab } from './PrestigeTab';
import { TabBar } from './TabBar';

export function GameLayout() {
  const {
    state, buffs, totalSps, effectiveClickPower, crystalPreview,
    handleClick, removeFloatingText, buyBuilding, retryBoss,
    setTab, openPrestigeConfirm, closePrestigeConfirm,
    executePrestige, buyPrestigeUpgrade,
  } = useGameState();

  const clickerAreaRef = useRef<HTMLDivElement>(null);

  const handleClickAt = (_x: number, _y: number) => {
    if (clickerAreaRef.current) {
      const rect = clickerAreaRef.current.getBoundingClientRect();
      const rx = (Math.random() - 0.5) * 60;
      handleClick(rect.width / 2 + rx, rect.height / 2 - 20);
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

      {/* 転生確認ダイアログ */}
      {state.showPrestigeConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <div className="confirm-icon">🌀</div>
            <div className="confirm-title">次元転生</div>
            <div className="confirm-body">
              すべてを捧げて転生しますか？<br />
              <span className="confirm-gain">💎 +{crystalPreview} 結晶を獲得</span>
            </div>
            <div className="confirm-buttons">
              <button className="confirm-yes" onClick={executePrestige}>転生する</button>
              <button className="confirm-no" onClick={closePrestigeConfirm}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="game-header">
        <h1 className="game-title">⚔️ SOUL HARVEST ⚔️</h1>
        <div className="header-crystals">💎 {state.crystals}</div>
      </header>

      <main className="game-main">
        {/* ===== メインタブ ===== */}
        {state.activeTab === 'main' && (
          <>
            <StageHeader
              stage={state.stage}
              killCount={state.killCount}
              killsToNext={state.killsToNext}
              battlePhase={state.battlePhase}
              bossTimeLeft={state.bossTimeLeft}
            />

            <SoulDisplay
              souls={state.souls}
              totalSouls={state.totalSoulsEver}
              sps={totalSps}
            />

            <EnemyArea
              enemy={state.enemy}
              stage={state.stage}
              battlePhase={state.battlePhase}
            />

            <div className="clicker-wrapper" ref={clickerAreaRef}>
              <ClickerButton onClickAt={handleClickAt} />
              {state.floatingTexts.map(item => (
                <FloatingText key={item.id} item={item} onRemove={removeFloatingText} />
              ))}
            </div>

            {/* バフ表示 */}
            {(buffs.totalMultiplier.gt(1) || buffs.clickMultiplier.gt(1)) && (
              <div className="buff-display">
                <span className="buff-item">⚡ クリック: {effectiveClickPower.toFixed(1)}</span>
                <span className="buff-item">🔮 生産倍率: ×{buffs.totalMultiplier.toFixed(2)}</span>
              </div>
            )}

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
          </>
        )}

        {/* ===== 転生タブ ===== */}
        {state.activeTab === 'prestige' && (
          <PrestigeTab
            state={state}
            buffs={buffs}
            crystalPreview={crystalPreview}
            onPrestige={openPrestigeConfirm}
            onBuyUpgrade={buyPrestigeUpgrade}
          />
        )}
      </main>

      {/* 下部タブバー */}
      <TabBar
        activeTab={state.activeTab}
        crystals={state.crystals}
        onTabChange={setTab}
      />
    </div>
  );
}