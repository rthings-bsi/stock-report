import type { CardWidth } from '@/components/CustomizableCard';

export interface LayoutCard {
  id: string;
  width: CardWidth;
}

/** Geser kartu satu posisi ke kiri/kanan. */
export function moveCard<T extends LayoutCard>(cards: T[], index: number, dir: 'left' | 'right'): T[] {
  const target = dir === 'left' ? index - 1 : index + 1;
  if (target < 0 || target >= cards.length) return cards;
  const next = [...cards];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Ubah lebar satu kartu berdasarkan id. */
export function resizeCard<T extends LayoutCard>(cards: T[], id: string, width: CardWidth): T[] {
  return cards.map((c) => (c.id === id ? { ...c, width } : c)) as T[];
}
