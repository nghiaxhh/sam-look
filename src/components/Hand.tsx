import { Card as CardType } from '../types/game';
import Card from './Card';

interface HandProps {
  cards: CardType[];
  faceUp: boolean;
  selectedCardIds: Set<string>;
  onCardClick?: (card: CardType) => void;
  small?: boolean;
}

export default function Hand({ cards, faceUp, selectedCardIds, onCardClick, small }: HandProps) {
  return (
    <div className="flex justify-center items-end py-1">
      {cards.map(card => (
        <div key={card.id} className={small ? '-ml-4.5 first:ml-0' : '-ml-5 first:ml-0'}>
          <Card
            card={card}
            faceUp={faceUp}
            selected={selectedCardIds.has(card.id)}
            onClick={onCardClick ? () => onCardClick(card) : undefined}
            small={small}
          />
        </div>
      ))}
    </div>
  );
}
