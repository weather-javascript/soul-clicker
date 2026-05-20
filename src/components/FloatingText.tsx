import { useEffect } from 'react';
import type { FloatingTextItem } from '../types/game';

interface Props {
  item: FloatingTextItem;
  onRemove: (id: number) => void;
}

export function FloatingText({ item, onRemove }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(item.id);
    }, 900); // アニメーション時間と合わせる
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  return (
    <div
      className="floating-text"
      style={{
        left: item.x,
        top: item.y,
      }}
    >
      {item.text}
    </div>
  );
}