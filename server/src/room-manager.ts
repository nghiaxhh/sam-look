import type { Card, Combination } from '../../src/types/game.js';

export interface ServerPlayer {
  socketId: string;
  name: string;
  hand: Card[];
  hasPassed: boolean;
  isConnected: boolean;
  score: number;
  samDeclared: boolean;
  samReady: boolean;
}

export interface TrickPlay {
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

export interface ServerGameState {
  phase: 'declaring' | 'playing' | 'sam_playing' | 'game_over';
  players: ServerPlayer[];
  currentPlayerIndex: number;
  currentTrick: TrickPlay | null;
  trickLeaderId: string;
  isFirstTurnOfGame: boolean;
  winnerId: string | null;
  previousWinnerId: string | null;
  gameLog: GameLogEntry[];
  samPlayerId: string | null;
  samResult: SamResult | null;
  turnDeadline: number;
}

export interface Room {
  id: string;
  hostId: string;
  players: ServerPlayer[];
  gameState: ServerGameState | null;
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createOrJoinRoom(roomId: string, socketId: string, playerName: string): Room | { error: string } {
    let room = this.rooms.get(roomId);

    if (!room) {
      // Create new room
      const player: ServerPlayer = {
        socketId,
        name: playerName,
        hand: [],
        hasPassed: false,
        isConnected: true,
        score: 0,
        samDeclared: false,
        samReady: false,
      };
      room = {
        id: roomId,
        hostId: socketId,
        players: [player],
        gameState: null,
      };
      this.rooms.set(roomId, room);
      return room;
    }

    // Room exists
    if (room.gameState && room.gameState.phase === 'playing') {
      return { error: 'Phòng đang chơi, không thể vào!' };
    }

    if (room.players.length >= 5) {
      return { error: 'Phòng đã đầy (tối đa 5 người)!' };
    }

    // Check duplicate name
    if (room.players.some(p => p.name === playerName)) {
      return { error: 'Tên đã được sử dụng trong phòng!' };
    }

    const player: ServerPlayer = {
      socketId,
      name: playerName,
      hand: [],
      hasPassed: false,
      isConnected: true,
      score: 0,
      samDeclared: false,
      samReady: false,
    };
    room.players.push(player);
    return room;
  }

  removePlayer(roomId: string, socketId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // If game is in progress, mark as disconnected instead of removing
    if (room.gameState && room.gameState.phase === 'playing') {
      const player = room.players.find(p => p.socketId === socketId);
      if (player) {
        player.isConnected = false;
      }
      // If all disconnected, delete room
      if (room.players.every(p => !p.isConnected)) {
        this.rooms.delete(roomId);
        return null;
      }
      // Transfer host if needed
      if (room.hostId === socketId) {
        const newHost = room.players.find(p => p.isConnected);
        if (newHost) room.hostId = newHost.socketId;
      }
      return room;
    }

    // Waiting phase: remove player entirely
    room.players = room.players.filter(p => p.socketId !== socketId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    // Transfer host if host left
    if (room.hostId === socketId) {
      room.hostId = room.players[0].socketId;
    }

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getPlayerRoom(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some(p => p.socketId === socketId)) {
        return room;
      }
    }
    return undefined;
  }
}
