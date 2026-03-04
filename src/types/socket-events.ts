import { Card, Combination } from './game';

// ---- Room Player (public info) ----
export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
}

// ---- Client → Server ----
export interface JoinRoomPayload {
  playerName: string;
  roomId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface StartGamePayload {
  roomId: string;
}

export interface PlayCardsPayload {
  roomId: string;
  cardIds: string[];
}

export interface PassPayload {
  roomId: string;
}

export interface NewGamePayload {
  roomId: string;
}

// ---- Server → Client ----
export interface JoinRoomSuccessPayload {
  roomId: string;
  playerId: string;
  players: RoomPlayer[];
}

export interface RoomUpdatePayload {
  roomId: string;
  players: RoomPlayer[];
  hostId: string;
}

export interface ErrorPayload {
  message: string;
}

export interface GamePlayerInfo {
  id: string;
  name: string;
  cardCount: number;
  hasPassed: boolean;
  score: number;
  samDeclared: boolean;
  samReady: boolean;
}

export interface TrickPlayInfo {
  playerId: string;
  playerName: string;
  combination: Combination;
}

export interface GameLogEntry {
  playerId: string;
  playerName: string;
  action: 'play' | 'pass';
  combination?: Combination;
}

export interface SamResult {
  samPlayerId: string;
  samPlayerName: string;
  success: boolean;
  blockerId?: string;
  blockerName?: string;
  pointsPerPlayer: number;
}

export interface FourOfAKindBlock {
  blockerId: string;
  blockerName: string;
  blockedPlayerId: string;
  blockedPlayerName: string;
}

export interface GameStatePayload {
  phase: 'declaring' | 'playing' | 'sam_playing' | 'game_over';
  players: GamePlayerInfo[];
  myHand: Card[];
  myPlayerId: string;
  currentPlayerId: string;
  currentTrick: TrickPlayInfo | null;
  trickLeaderId: string;
  isFirstTurnOfGame: boolean;
  winnerId: string | null;
  gameLog: GameLogEntry[];
  roomId: string;
  hostId: string;
  samPlayerId: string | null;
  samResult: SamResult | null;
  turnDeadline: number;
  revealedHands: Record<string, Card[]> | null;
  readyPlayerIds: string[];
  fourOfAKindBlock: FourOfAKindBlock | null;
}

export interface PlayerDisconnectedPayload {
  playerName: string;
}
