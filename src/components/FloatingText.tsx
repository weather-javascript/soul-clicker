import { useEffect } from 'react';
import type { FloatingTextItem } from '../types/game';

interface Props {
  item: FloatingTextItem;
  onRemove: (id: number) => void;
}

export function FloatingText({ item, onRemove }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), item.isCritical ? 1200 : 900);
    return () => clearTimeout(t);
  }, [item.id, item.isCritical, onRemove]);

  return (
    <div
      className={`floating-text ${item.isCritical ? 'critical' : ''}`}
      style={{ left: item.x, top: item.y }}
    >
      {item.text}
    </div>
  );
}