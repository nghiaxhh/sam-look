import { Card, Rank, Suit } from '../types/game';
import { RANKS, SUITS, RANK_VALUES, CARDS_PER_PLAYER } from './constants';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}-${suit}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck: Card[], playerCount: number = 4): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < CARDS_PER_PLAYER * playerCount; i++) {
    hands[i % playerCount].push(deck[i]);
  }
  return hands.map(sortHand);
}

const SUIT_VALUES: Record<Suit, number> = {
  spades: 0, clubs: 1, diamonds: 2, hearts: 3,
};

export function getCardValue(card: Card): number {
  return RANK_VALUES[card.rank] * 4 + SUIT_VALUES[card.suit];
}

export function compareCards(a: Card, b: Card): number {
  return getCardValue(a) - getCardValue(b);
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort(compareCards);
}

export function findPlayerWithLowestCard(hands: Card[][]): number {
  let lowestPlayerIndex = 0;
  let lowestValue = Infinity;

  for (let i = 0; i < hands.length; i++) {
    // Hands are already sorted ascending, so first card is lowest
    if (hands[i].length > 0) {
      const val = getCardValue(hands[i][0]);
      if (val < lowestValue) {
        lowestValue = val;
        lowestPlayerIndex = i;
      }
    }
  }
  return lowestPlayerIndex;
}

export function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

export function getSuitSymbol(suit: Suit): string {
  return { spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥' }[suit];
}

export function formatCombination(cards: Card[]): string {
  return cards.map(c => `${c.rank}${getSuitSymbol(c.suit)}`).join(' ');
}
