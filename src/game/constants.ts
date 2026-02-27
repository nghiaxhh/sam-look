import { Rank, Suit } from '../types/game';

export const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

export const SUITS: Suit[] = ['spades', 'clubs', 'diamonds', 'hearts'];

export const RANK_VALUES: Record<Rank, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠', clubs: '♣', diamonds: '♦', hearts: '♥',
};

export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1a1a1a', clubs: '#1a1a1a', diamonds: '#cc0000', hearts: '#cc0000',
};

export const CARDS_PER_PLAYER = 10;
