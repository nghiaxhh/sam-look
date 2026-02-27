import type { Card as CardType, Rank, Suit } from '../types/game';
import type { GamePlayerInfo } from '../types/socket-events';
import Hand from './Hand';

interface PlayerAreaProps {
  player: GamePlayerInfo;
  myHand?: CardType[];
  isCurrentTurn: boolean;
  isMe: boolean;
  position: 'top' | 'left' | 'right' | 'bottom' | 'top-left' | 'top-right';
  selectedCardIds?: Set<string>;
  onCardClick?: (card: CardType) => void;
  showCardCount?: boolean;
}

const positionClasses: Record<string, string> = {
  'top': 'grid-area-top self-start',
  'top-left': 'grid-area-topleft self-start',
  'top-right': 'grid-area-topright self-start',
  'left': 'grid-area-left self-center',
  'right': 'grid-area-right self-center',
  'bottom': 'grid-area-bottom self-end',
};

export default function PlayerArea({
  player,
  myHand,
  isCurrentTurn,
  isMe,
  position,
  selectedCardIds = new Set(),
  onCardClick,
  showCardCount,
}: PlayerAreaProps) {
  const cards: CardType[] = isMe && myHand
    ? myHand
    : Array.from({ length: player.cardCount }, (_, i) => ({
        rank: '3' as Rank,
        suit: 'spades' as Suit,
        id: `hidden-${player.id}-${i}`,
      }));

  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-[10px] transition-colors duration-300 ${positionClasses[position]} ${isCurrentTurn ? 'bg-[rgba(255,215,0,0.12)]' : ''} ${player.hasPassed ? 'opacity-55' : ''}`}>
      <div className="flex items-center gap-2 text-white text-[13px]">
        <span className="font-bold text-sm">{player.name}{isMe ? ' (Bạn)' : ''}</span>
        <span className="bg-white/15 py-0.5 px-2 rounded-[10px] text-[11px]">{player.cardCount} lá</span>
        {player.score !== 0 && (
          <span className={`text-[11px] font-bold py-0.5 px-1.5 rounded-lg ${player.score > 0 ? 'text-[#2ecc71] bg-[rgba(46,204,113,0.15)]' : 'text-[#e74c3c] bg-[rgba(231,76,60,0.15)]'}`}>
            {player.score > 0 ? `+${player.score}` : player.score}
          </span>
        )}
        {player.samDeclared && <span className="bg-linear-to-br from-[#e74c3c] to-btn-danger text-white text-[10px] font-bold py-0.5 px-1.5 rounded-md tracking-wide">SAM</span>}
        {player.cardCount === 1 && !isMe && (
          <span className="inline-flex items-center gap-1 text-white text-xs font-bold leading-none bg-[#e74c3c] py-0.75 px-2 rounded-[10px] animate-pulse-warning shadow-[0_0_8px_rgba(231,76,60,0.7),0_0_16px_rgba(231,76,60,0.4)]" title="Còn 1 lá!">
            <span className="text-sm">&#9888;</span> Còn 1 lá!
          </span>
        )}
        {player.hasPassed && <span className="text-[#e74c3c] text-[11px] font-semibold">Bỏ lượt</span>}
        {isCurrentTurn && !player.hasPassed && <span className="text-highlight-gold text-[11px] font-semibold animate-blink">Đang đánh...</span>}
      </div>
      {showCardCount && player.cardCount > 0 && (
        <div className="text-highlight-gold text-base font-bold bg-black/40 py-1 px-3 rounded-lg">Còn {player.cardCount} lá</div>
      )}
      <Hand
        cards={cards}
        faceUp={isMe}
        selectedCardIds={isMe ? selectedCardIds : new Set()}
        onCardClick={isMe ? onCardClick : undefined}
        small={!isMe}
      />
    </div>
  );
}
