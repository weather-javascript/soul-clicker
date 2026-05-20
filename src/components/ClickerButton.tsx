import { useRef } from 'react';

interface Props {
  onClickAt: (x: number, y: number) => void;
}

export function ClickerButton({ onClickAt }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    let x: number, y: number;

    if ('touches' in e) {
      // タッチイベント
      const touch = e.changedTouches[0];
      const rect = btnRef.current!.getBoundingClientRect();
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      const rect = btnRef.current!.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    onClickAt(x, y);

    // ボタン押下エフェクト
    if (btnRef.current) {
      btnRef.current.classList.add('clicked');
      setTimeout(() => btnRef.current?.classList.remove('clicked'), 100);
    }
  };

  return (
    <div className="clicker-area">
      <button
        ref={btnRef}
        className="clicker-button"
        onClick={handleClick}
        onTouchStart={(e) => {
          e.preventDefault(); // ダブルタップズーム防止
          handleClick(e);
        }}
        aria-label="ソウルを収穫する"
      >
        <span className="clicker-icon">😈</span>
        <div className="clicker-ring" />
      </button>
      <p className="clicker-hint">タップしてソウルを収穫</p>
    </div>
  );
}