import {
  createDeck,
  dealCards,
  findPlayerWithLowestCard,
  shuffleDeck,
  sortHand,
} from "../../src/game/card-utils.js";
import {
  canBeat,
  classifyCombination,
  wouldLeaveOnlyTwos,
} from "../../src/game/combination-utils.js";
import { Card } from "../../src/types/game.js";
import type {
  GameLogEntry as ClientLogEntry,
  GamePlayerInfo,
  GameStatePayload,
  SamResult,
  TrickPlayInfo,
} from "../../src/types/socket-events.js";
import type { Room, ServerGameState, TrickPlay } from "./room-manager.js";

const TURN_TIMEOUT_MS = 15000;

export class GameManager {
  startGame(room: Room, previousWinnerId?: string): void {
    const playerCount = room.players.length;
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck, playerCount);

    // Reset players
    room.players.forEach((p, i) => {
      p.hand = hands[i];
      p.hasPassed = false;
      p.samDeclared = false;
      p.samReady = false;
      p.readyForNextGame = false;
    });

    // First player: previous winner goes first, otherwise whoever has the lowest card
    let firstPlayerIndex: number;
    if (previousWinnerId) {
      firstPlayerIndex = room.players.findIndex(
        (p) => p.socketId === previousWinnerId,
      );
      if (firstPlayerIndex === -1) firstPlayerIndex = 0;
    } else {
      firstPlayerIndex = findPlayerWithLowestCard(hands);
    }

    room.gameState = {
      phase: "declaring",
      players: room.players,
      currentPlayerIndex: firstPlayerIndex,
      currentTrick: null,
      trickLeaderId: room.players[firstPlayerIndex].socketId,
      isFirstTurnOfGame: false,
      winnerId: null,
      previousWinnerId: previousWinnerId ?? null,
      gameLog: [],
      samPlayerId: null,
      samResult: null,
      turnDeadline: Date.now() + TURN_TIMEOUT_MS,
    };
  }

  declareSam(
    room: Room,
    socketId: string,
  ): { success: boolean; error?: string } {
    const gs = room.gameState;
    if (!gs || gs.phase !== "declaring")
      return { success: false, error: "Không thể báo sâm lúc này" };

    const player = gs.players.find((p) => p.socketId === socketId);
    if (!player) return { success: false, error: "Người chơi không tồn tại" };

    if (gs.samPlayerId)
      return { success: false, error: "Đã có người báo sâm rồi!" };

    player.samDeclared = true;
    player.samReady = true;
    gs.samPlayerId = socketId;

    // Mark all other players as ready (they don't need to choose anymore)
    gs.players.forEach((p) => {
      if (p.socketId !== socketId) {
        p.samReady = true;
      }
    });

    // Start sam play immediately
    this.startSamPlay(gs, socketId);
    this.resetDeadline(gs);

    return { success: true };
  }

  skipSam(room: Room, socketId: string): { success: boolean; error?: string } {
    const gs = room.gameState;
    if (!gs || gs.phase !== "declaring")
      return { success: false, error: "Không thể bỏ qua lúc này" };

    const player = gs.players.find((p) => p.socketId === socketId);
    if (!player) return { success: false, error: "Người chơi không tồn tại" };

    player.samReady = true;

    // Check if all players are ready (no one declared sam)
    if (gs.players.every((p) => p.samReady)) {
      // No one declared sam, proceed to normal play
      gs.phase = "playing";
      this.resetDeadline(gs);
    }

    return { success: true };
  }

  private startSamPlay(gs: ServerGameState, samPlayerId: string): void {
    const samPlayerIndex = gs.players.findIndex(
      (p) => p.socketId === samPlayerId,
    );
    gs.phase = "sam_playing";
    gs.currentPlayerIndex = samPlayerIndex;
    gs.currentTrick = null;
    gs.trickLeaderId = samPlayerId;
    gs.players.forEach((p) => {
      p.hasPassed = false;
    });
  }

  processSamPlay(
    room: Room,
    socketId: string,
    cardIds: string[],
  ): { success: boolean; error?: string } {
    const gs = room.gameState;
    if (!gs || gs.phase !== "sam_playing")
      return { success: false, error: "Không phải lượt sâm" };
    if (gs.samPlayerId !== socketId)
      return { success: false, error: "Chỉ người báo sâm mới được đánh" };

    const currentPlayer = gs.players[gs.currentPlayerIndex];
    if (currentPlayer.socketId !== socketId)
      return { success: false, error: "Chưa đến lượt bạn" };

    // Find actual cards in player's hand
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const card = currentPlayer.hand.find((c) => c.id === cardId);
      if (!card) return { success: false, error: "Bài không hợp lệ" };
      cards.push(card);
    }

    const combo = classifyCombination(cards);
    if (!combo) return { success: false, error: "Tổ hợp bài không hợp lệ" };

    if (wouldLeaveOnlyTwos(currentPlayer.hand, cards)) {
      return { success: false, error: "Không được để lại chỉ toàn lá 2!" };
    }

    // Remove cards from hand
    const cardIdSet = new Set(cardIds);
    currentPlayer.hand = sortHand(
      currentPlayer.hand.filter((c) => !cardIdSet.has(c.id)),
    );

    // Set the trick
    const trickPlay: TrickPlay = {
      playerId: socketId,
      playerName: currentPlayer.name,
      combination: combo,
    };
    gs.currentTrick = trickPlay;
    gs.trickLeaderId = socketId;

    gs.gameLog.push({
      playerId: socketId,
      playerName: currentPlayer.name,
      action: "play",
      combination: combo,
    });

    // Reset passes for challenge round
    gs.players.forEach((p) => {
      p.hasPassed = false;
    });

    // Check if sam player has played all cards
    if (currentPlayer.hand.length === 0) {
      // Sam success! No one blocked
      this.samSuccess(gs);
      return { success: true };
    }

    // Move to next player for potential challenge
    gs.currentPlayerIndex = this.getNextPlayerIndex(
      gs,
      gs.players.findIndex((p) => p.socketId === socketId),
    );
    this.resetDeadline(gs);

    return { success: true };
  }

  processSamChallenge(
    room: Room,
    socketId: string,
    cardIds: string[],
  ): { success: boolean; error?: string } {
    const gs = room.gameState;
    if (!gs || gs.phase !== "sam_playing")
      return { success: false, error: "Không phải lượt sâm" };
    if (gs.samPlayerId === socketId)
      return {
        success: false,
        error: "Người báo sâm không được chặn chính mình",
      };

    const currentPlayer = gs.players[gs.currentPlayerIndex];
    if (currentPlayer.socketId !== socketId)
      return { success: false, error: "Chưa đến lượt bạn" };

    if (!gs.currentTrick)
      return { success: false, error: "Không có bài để chặn" };

    // Find actual cards in player's hand
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const card = currentPlayer.hand.find((c) => c.id === cardId);
      if (!card) return { success: false, error: "Bài không hợp lệ" };
      cards.push(card);
    }

    const combo = classifyCombination(cards);
    if (!combo) return { success: false, error: "Tổ hợp bài không hợp lệ" };

    if (!canBeat(gs.currentTrick.combination, combo)) {
      return { success: false, error: "Bài không đủ lớn!" };
    }

    // Sam blocked!
    this.samFailed(gs, socketId, currentPlayer.name);
    return { success: true };
  }

  processSamPass(
    room: Room,
    socketId: string,
  ): { success: boolean; error?: string } {
    const gs = room.gameState;
    if (!gs || gs.phase !== "sam_playing")
      return { success: false, error: "Không phải lượt sâm" };
    if (gs.samPlayerId === socketId)
      return { success: false, error: "Người báo sâm không được bỏ lượt" };

    const currentPlayer = gs.players[gs.currentPlayerIndex];
    if (currentPlayer.socketId !== socketId)
      return { success: false, error: "Chưa đến lượt bạn" };

    currentPlayer.hasPassed = true;

    // Check if all non-sam players have passed
    const samPlayerIndex = gs.players.findIndex(
      (p) => p.socketId === gs.samPlayerId,
    );
    const otherPlayers = gs.players.filter((p, i) => i !== samPlayerIndex);
    const allPassed = otherPlayers.every((p) => p.hasPassed);

    if (allPassed) {
      // No one challenged this trick, sam player continues
      gs.currentPlayerIndex = samPlayerIndex;
      gs.currentTrick = null;
      gs.players.forEach((p) => {
        p.hasPassed = false;
      });
      this.resetDeadline(gs);
      return { success: true };
    }

    // Move to next non-sam player
    gs.currentPlayerIndex = this.getNextChallengerIndex(
      gs,
      gs.currentPlayerIndex,
    );
    this.resetDeadline(gs);

    return { success: true };
  }

  private getNextPlayerIndex(gs: ServerGameState, fromIndex: number): number {
    const count = gs.players.length;
    return (fromIndex + 1) % count;
  }

  private getNextChallengerIndex(
    gs: ServerGameState,
    fromIndex: number,
  ): number {
    const count = gs.players.length;
    const samIndex = gs.players.findIndex((p) => p.socketId === gs.samPlayerId);
    let next = (fromIndex + 1) % count;
    let attempts = 0;
    while (attempts < count) {
      if (next !== samIndex && !gs.players[next].hasPassed) {
        return next;
      }
      next = (next + 1) % count;
      attempts++;
    }
    // Everyone passed, back to sam player
    return samIndex;
  }

  private samSuccess(gs: ServerGameState): void {
    const samPlayer = gs.players.find((p) => p.socketId === gs.samPlayerId)!;
    const opponentCount = gs.players.length - 1;
    const pointsPerPlayer = 20;

    samPlayer.score += opponentCount * pointsPerPlayer;
    gs.players.forEach((p) => {
      if (p.socketId !== gs.samPlayerId) {
        p.score -= pointsPerPlayer;
      }
    });

    gs.samResult = {
      samPlayerId: gs.samPlayerId!,
      samPlayerName: samPlayer.name,
      success: true,
      pointsPerPlayer,
    };

    gs.phase = "game_over";
    gs.winnerId = gs.samPlayerId;
  }

  private samFailed(
    gs: ServerGameState,
    blockerId: string,
    blockerName: string,
  ): void {
    const samPlayer = gs.players.find((p) => p.socketId === gs.samPlayerId)!;
    const blocker = gs.players.find((p) => p.socketId === blockerId)!;
    const opponentCount = gs.players.length - 1;
    const pointsPerPlayer = 20;

    samPlayer.score -= opponentCount * pointsPerPlayer;
    blocker.score += opponentCount * pointsPerPlayer;

    gs.samResult = {
      samPlayerId: gs.samPlayerId!,
      samPlayerName: samPlayer.name,
      success: false,
      blockerId,
      blockerName,
      pointsPerPlayer,
    };

    gs.phase = "game_over";
    gs.winnerId = blockerId;
  }

  private normalWin(gs: ServerGameState, winnerId: string): void {
    const BURN_PENALTY = 15;
    let totalPoints = 0;
    for (const p of gs.players) {
      if (p.socketId !== winnerId) {
        const remaining = p.hand.length;
        // "Thua cháy": still has all 10 cards (never played any)
        const penalty = remaining === 10 ? BURN_PENALTY : remaining;
        p.score -= penalty;
        totalPoints += penalty;
      }
    }
    const winner = gs.players.find((p) => p.socketId === winnerId)!;
    winner.score += totalPoints;

    gs.phase = "game_over";
    gs.winnerId = winnerId;
  }

  processPlay(
    room: Room,
    socketId: string,
    cardIds: string[],
  ): { success: boolean; error?: string } {
    const gs = room.gameState;
    if (!gs || gs.phase !== "playing")
      return { success: false, error: "Game chưa bắt đầu" };

    const currentPlayer = gs.players[gs.currentPlayerIndex];
    if (currentPlayer.socketId !== socketId)
      return { success: false, error: "Chưa đến lượt bạn" };

    // Find actual cards in player's hand
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const card = currentPlayer.hand.find((c) => c.id === cardId);
      if (!card) return { success: false, error: "Bài không hợp lệ" };
      cards.push(card);
    }

    const combo = classifyCombination(cards);
    if (!combo) return { success: false, error: "Tổ hợp bài không hợp lệ" };

    if (wouldLeaveOnlyTwos(currentPlayer.hand, cards)) {
      return { success: false, error: "Không được để lại chỉ toàn lá 2!" };
    }

    if (gs.currentTrick && !canBeat(gs.currentTrick.combination, combo)) {
      return { success: false, error: "Bài không đủ lớn!" };
    }

    // Remove cards from hand
    const cardIdSet = new Set(cardIds);
    currentPlayer.hand = sortHand(
      currentPlayer.hand.filter((c) => !cardIdSet.has(c.id)),
    );

    // New trick
    const trickPlay: TrickPlay = {
      playerId: socketId,
      playerName: currentPlayer.name,
      combination: combo,
    };
    gs.currentTrick = trickPlay;
    gs.trickLeaderId = socketId;
    gs.isFirstTurnOfGame = false;

    // Reset all passes (new trick leader)
    gs.players.forEach((p) => {
      p.hasPassed = false;
    });

    // Log
    gs.gameLog.push({
      playerId: socketId,
      playerName: currentPlayer.name,
      action: "play",
      combination: combo,
    });

    // Check win
    if (currentPlayer.hand.length === 0) {
      this.normalWin(gs, socketId);
      return { success: true };
    }

    // Next player
    gs.currentPlayerIndex = this.getNextActivePlayer(gs, gs.currentPlayerIndex);
    this.resetDeadline(gs);
    this.autoPassDisconnected(room);
    return { success: true };
  }

  processPass(
    room: Room,
    socketId: string,
  ): { success: boolean; error?: string } {
    const gs = room.gameState;
    if (!gs || gs.phase !== "playing")
      return { success: false, error: "Game chưa bắt đầu" };

    const currentPlayer = gs.players[gs.currentPlayerIndex];
    if (currentPlayer.socketId !== socketId)
      return { success: false, error: "Chưa đến lượt bạn" };

    if (gs.currentTrick === null)
      return { success: false, error: "Đang đánh tự do, không thể bỏ" };

    currentPlayer.hasPassed = true;

    gs.gameLog.push({
      playerId: socketId,
      playerName: currentPlayer.name,
      action: "pass",
    });

    // Check if all others passed
    const activePlayers = gs.players.filter(
      (p) => p.hand.length > 0 && !p.hasPassed,
    );

    if (activePlayers.length <= 1) {
      // Trick leader gets free turn
      const leaderIndex = gs.players.findIndex(
        (p) => p.socketId === gs.trickLeaderId,
      );
      if (leaderIndex !== -1 && gs.players[leaderIndex].hand.length > 0) {
        gs.currentTrick = null;
        gs.currentPlayerIndex = leaderIndex;
        gs.players.forEach((p) => {
          p.hasPassed = false;
        });
        this.resetDeadline(gs);
        this.autoPassDisconnected(room);
        return { success: true };
      }
    }

    gs.currentPlayerIndex = this.getNextActivePlayer(gs, gs.currentPlayerIndex);
    this.resetDeadline(gs);
    this.autoPassDisconnected(room);
    return { success: true };
  }

  private getNextActivePlayer(gs: ServerGameState, fromIndex: number): number {
    const count = gs.players.length;
    let next = (fromIndex + 1) % count;
    let attempts = 0;
    while (attempts < count) {
      if (gs.players[next].hand.length > 0 && !gs.players[next].hasPassed) {
        return next;
      }
      next = (next + 1) % count;
      attempts++;
    }
    return fromIndex;
  }

  private autoPassDisconnected(room: Room): void {
    const gs = room.gameState;
    if (!gs || gs.phase !== "playing") return;

    // If current player is disconnected, auto-pass for them
    const current = gs.players[gs.currentPlayerIndex];
    if (!current.isConnected && current.hand.length > 0) {
      if (gs.currentTrick !== null) {
        // Can pass
        current.hasPassed = true;
        gs.gameLog.push({
          playerId: current.socketId,
          playerName: current.name,
          action: "pass",
        });

        const activePlayers = gs.players.filter(
          (p) => p.hand.length > 0 && !p.hasPassed,
        );
        if (activePlayers.length <= 1) {
          const leaderIndex = gs.players.findIndex(
            (p) => p.socketId === gs.trickLeaderId,
          );
          if (leaderIndex !== -1 && gs.players[leaderIndex].hand.length > 0) {
            gs.currentTrick = null;
            gs.currentPlayerIndex = leaderIndex;
            gs.players.forEach((p) => {
              p.hasPassed = false;
            });
            this.autoPassDisconnected(room);
            return;
          }
        }

        gs.currentPlayerIndex = this.getNextActivePlayer(
          gs,
          gs.currentPlayerIndex,
        );
        this.autoPassDisconnected(room);
      }
      // If leading (currentTrick === null), disconnected player can't play
      // Play their lowest card automatically (prefer non-2 to avoid "only 2s left" rule)
      else if (current.hand.length > 0) {
        const nonTwoCard = current.hand.find((c) => c.rank !== "2");
        const lowestCard = nonTwoCard ?? current.hand[0]; // hand is sorted
        const combo = classifyCombination([lowestCard]);
        if (combo) {
          current.hand = current.hand.slice(1);
          gs.currentTrick = {
            playerId: current.socketId,
            playerName: current.name,
            combination: combo,
          };
          gs.trickLeaderId = current.socketId;
          gs.isFirstTurnOfGame = false;
          gs.players.forEach((p) => {
            p.hasPassed = false;
          });
          gs.gameLog.push({
            playerId: current.socketId,
            playerName: current.name,
            action: "play",
            combination: combo,
          });

          if (current.hand.length === 0) {
            this.normalWin(gs, current.socketId);
            return;
          }

          gs.currentPlayerIndex = this.getNextActivePlayer(
            gs,
            gs.currentPlayerIndex,
          );
          this.autoPassDisconnected(room);
        }
      }
    }
  }

  private resetDeadline(gs: ServerGameState): void {
    gs.turnDeadline = Date.now() + TURN_TIMEOUT_MS;
  }

  autoTimeoutAction(room: Room): void {
    const gs = room.gameState;
    if (!gs) return;

    if (gs.phase === "declaring") {
      // Auto-skip sam for all players who haven't decided yet
      for (const p of gs.players) {
        if (!p.samReady) {
          p.samReady = true;
        }
      }
      // If no one declared sam, move to playing
      if (!gs.samPlayerId) {
        gs.phase = "playing";
        this.resetDeadline(gs);
      }
      return;
    }

    if (gs.phase === "playing") {
      const current = gs.players[gs.currentPlayerIndex];
      if (gs.currentTrick !== null) {
        // Has a trick to beat → auto-pass
        this.processPass(room, current.socketId);
      } else {
        // Free play → play lowest non-2 card (respect "no only 2s left" rule)
        if (current.hand.length > 0) {
          const nonTwoCard = current.hand.find((c) => c.rank !== "2");
          const cardToPlay = nonTwoCard ?? current.hand[0];
          this.processPlay(room, current.socketId, [cardToPlay.id]);
        }
      }
      return;
    }

    if (gs.phase === "sam_playing") {
      const current = gs.players[gs.currentPlayerIndex];
      if (current.socketId === gs.samPlayerId) {
        // Sam player's turn → play lowest non-2 card
        if (current.hand.length > 0) {
          const nonTwoCard = current.hand.find((c) => c.rank !== "2");
          const cardToPlay = nonTwoCard ?? current.hand[0];
          this.processSamPlay(room, current.socketId, [cardToPlay.id]);
        }
      } else {
        // Challenger's turn → auto-pass
        this.processSamPass(room, current.socketId);
      }
      return;
    }
  }

  buildGameStateForPlayer(room: Room, socketId: string): GameStatePayload {
    const gs = room.gameState!;

    const players: GamePlayerInfo[] = gs.players.map((p) => ({
      id: p.socketId,
      name: p.name,
      cardCount: p.hand.length,
      hasPassed: p.hasPassed,
      score: p.score,
      samDeclared: p.samDeclared,
      samReady: p.samReady,
    }));

    const me = gs.players.find((p) => p.socketId === socketId);
    const myHand = me ? me.hand : [];

    let currentTrick: TrickPlayInfo | null = null;
    if (gs.currentTrick) {
      currentTrick = {
        playerId: gs.currentTrick.playerId,
        playerName: gs.currentTrick.playerName,
        combination: gs.currentTrick.combination,
      };
    }

    const gameLog: ClientLogEntry[] = gs.gameLog.slice(-8).map((l) => ({
      playerId: l.playerId,
      playerName: l.playerName,
      action: l.action,
      combination: l.combination,
    }));

    let samResult: SamResult | null = null;
    if (gs.samResult) {
      samResult = {
        samPlayerId: gs.samResult.samPlayerId,
        samPlayerName: gs.samResult.samPlayerName,
        success: gs.samResult.success,
        blockerId: gs.samResult.blockerId,
        blockerName: gs.samResult.blockerName,
        pointsPerPlayer: gs.samResult.pointsPerPlayer,
      };
    }

    // On game_over, reveal all players' remaining hands
    let revealedHands: Record<string, Card[]> | null = null;
    if (gs.phase === "game_over") {
      revealedHands = {};
      for (const p of gs.players) {
        if (p.hand.length > 0) {
          revealedHands[p.socketId] = p.hand;
        }
      }
    }

    const readyPlayerIds = gs.players
      .filter((p) => p.readyForNextGame)
      .map((p) => p.socketId);

    return {
      phase: gs.phase,
      players,
      myHand,
      myPlayerId: socketId,
      currentPlayerId: gs.players[gs.currentPlayerIndex]?.socketId ?? "",
      currentTrick,
      trickLeaderId: gs.trickLeaderId,
      isFirstTurnOfGame: gs.isFirstTurnOfGame,
      winnerId: gs.winnerId,
      gameLog,
      roomId: room.id,
      hostId: room.hostId,
      samPlayerId: gs.samPlayerId,
      samResult,
      turnDeadline: gs.turnDeadline,
      revealedHands,
      readyPlayerIds,
    };
  }
}
