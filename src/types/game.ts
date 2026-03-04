export type Suit = 'spades' | 'clubs' | 'diamonds' | 'hearts';

export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  rank: Rank;
  suit: Suit;
  id: string;
}

export type CombinationType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'four_of_a_kind'
  | 'sequence'
  | 'pair_sequence';

export interface Combination {
  type: CombinationType;
  cards: Card[];
  highRank: Rank;
  length: number;
  twoIsLow?: boolean;
}

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  isHuman: boolean;
  hasPassed: boolean;
}

export type GamePhase = 'playing' | 'game_over';

export interface TrickPlay {
  playerId: number;
  combination: Combination;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  currentTrick: TrickPlay | null;
  trickLeaderId: number;
  isFirstTurnOfGame: boolean;
  winnerId: number | null;
  previousWinnerId: number | null;
  gameLog: LogEntry[];
}

export interface LogEntry {
  playerId: number;
  action: 'play' | 'pass';
  combination?: Combination;
}

export type GameAction =
  | { type: 'START_GAME'; previousWinnerId?: number }
  | { type: 'PLAY_CARDS'; playerId: number; cards: Card[] }
  | { type: 'PASS'; playerId: number };
