interface Props {
  userId: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaveTime: number;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
}

export function SettingsTab({ userId, saveStatus, lastSaveTime, onSave, onLoad, onReset }: Props) {
  const lastSaveStr = lastSaveTime
    ? new Date(lastSaveTime).toLocaleString('ja-JP')
    : '未保存';

  const statusLabel = {
    idle:   '💾 クラウドに保存',
    saving: '⏳ 処理中...',
    saved:  '✅ 完了！',
    error:  '❌ 失敗',
  }[saveStatus];

  return (
    <div className="settings-tab">
      <div className="settings-section">
        <div className="settings-section-title">👤 ユーザー情報</div>
        <div className="uid-card">
          <div className="uid-label">ユーザーID</div>
          <div className="uid-value">{userId}</div>
          <div className="uid-note">このIDでクラウドにデータが保存されます</div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">☁️ クラウドセーブ</div>
        <div className="save-time">最終保存: {lastSaveStr}</div>
        <div className="settings-note">✅ 30秒ごとに自動保存されます</div>
        <div className="settings-buttons">
          <button
            className={`settings-btn save-btn ${saveStatus !== 'idle' ? 'processing' : ''}`}
            onClick={onSave}
            disabled={saveStatus !== 'idle'}
          >
            {statusLabel}
          </button>
          <button
            className="settings-btn load-btn"
            onClick={onLoad}
            disabled={saveStatus !== 'idle'}
          >
            📥 クラウドから読み込み
          </button>
        </div>
      </div>

      <div className="settings-section danger-zone">
        <div className="settings-section-title">⚠️ 危険ゾーン</div>
        <p className="danger-note">以下の操作は取り消せません</p>
        <button className="settings-btn reset-btn" onClick={onReset}>
          🗑️ ゲームを全リセット
        </button>
      </div>
    </div>
  );
}