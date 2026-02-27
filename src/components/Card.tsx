import { Card as CardType } from '../types/game';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../game/constants';

interface CardProps {
  card: CardType;
  faceUp: boolean;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
}

export default function Card({ card, faceUp, selected, onClick, small }: CardProps) {
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  const sizeClasses = small ? 'w-10 h-[58px]' : 'w-card-w h-card-h';
  const baseClasses = `${sizeClasses} rounded-card relative select-none transition-[transform,box-shadow] duration-150 ease-in-out shrink-0 border`;

  if (!faceUp) {
    return (
      <div className={`${baseClasses} bg-[#2c5aa0] border-2 border-[#1a3d70] overflow-hidden`}>
        <div className="card-back-pattern" />
      </div>
    );
  }

  const selectedClasses = selected
    ? '-translate-y-3.5 shadow-[0_0_10px_var(--color-highlight-gold),2px_4px_8px_var(--color-card-shadow)] border-highlight-gold'
    : 'border-[#ccc] shadow-[1px_2px_4px_var(--color-card-shadow)]';
  const clickableClasses = onClick ? 'cursor-pointer hover:shadow-[2px_4px_8px_rgba(0,0,0,0.4)]' : '';

  return (
    <div
      className={`${baseClasses} bg-card-white ${selectedClasses} ${clickableClasses}`}
      style={{ color }}
      onClick={onClick}
    >
      <div className="absolute flex flex-col items-center leading-none top-1 left-1.25">
        <span className={`${small ? 'text-[10px]' : 'text-sm'} font-bold`}>{card.rank}</span>
        <span className={small ? 'text-[8px]' : 'text-[10px]'}>{symbol}</span>
      </div>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${small ? 'text-base' : 'text-2xl'}`}>
        {symbol}
      </div>
      <div className="absolute flex flex-col items-center leading-none bottom-1 right-1.25 rotate-180">
        <span className={`${small ? 'text-[10px]' : 'text-sm'} font-bold`}>{card.rank}</span>
        <span className={small ? 'text-[8px]' : 'text-[10px]'}>{symbol}</span>
      </div>
    </div>
  );
}
