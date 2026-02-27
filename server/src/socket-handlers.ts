import { Server, Socket } from 'socket.io';
import { RoomManager, Room } from './room-manager.js';
import { GameManager } from './game-manager.js';

const roomManager = new RoomManager();
const gameManager = new GameManager();
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTurnTimer(roomId: string) {
  const timer = turnTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(roomId);
  }
}

function startTurnTimer(io: Server, room: Room) {
  clearTurnTimer(room.id);

  if (!room.gameState || room.gameState.phase === 'game_over') return;

  const roomId = room.id;
  const timer = setTimeout(() => {
    turnTimers.delete(roomId);

    const currentRoom = roomManager.getRoom(roomId);
    if (!currentRoom || !currentRoom.gameState || currentRoom.gameState.phase === 'game_over') return;

    gameManager.autoTimeoutAction(currentRoom);
    broadcastGameState(io, currentRoom);

    // If game is still going after timeout action, start next timer
    // Re-check phase (autoTimeoutAction may have mutated it)
    if (currentRoom.gameState && (currentRoom.gameState.phase as string) !== 'game_over') {
      startTurnTimer(io, currentRoom);
    }
  }, 10000);

  turnTimers.set(roomId, timer);
}

function broadcastRoomUpdate(io: Server, room: ReturnType<RoomManager['getRoom']>) {
  if (!room) return;
  io.to(room.id).emit('server:room-update', {
    roomId: room.id,
    players: room.players.map(p => ({
      id: p.socketId,
      name: p.name,
      isHost: p.socketId === room.hostId,
    })),
    hostId: room.hostId,
  });
}

function broadcastGameState(io: Server, room: ReturnType<RoomManager['getRoom']>) {
  if (!room || !room.gameState) return;
  for (const player of room.players) {
    if (player.isConnected) {
      const state = gameManager.buildGameStateForPlayer(room, player.socketId);
      io.to(player.socketId).emit('server:game-state', state);
    }
  }
}

export function registerSocketHandlers(io: Server, socket: Socket) {

  socket.on('client:join-room', (data: { playerName: string; roomId: string }) => {
    const { playerName, roomId } = data;

    if (!playerName || !roomId) {
      socket.emit('server:error', { message: 'Tên và số phòng không được trống!' });
      return;
    }

    const result = roomManager.createOrJoinRoom(roomId, socket.id, playerName);

    if ('error' in result) {
      socket.emit('server:error', { message: result.error });
      return;
    }

    socket.join(roomId);
    (socket.data as Record<string, string>).roomId = roomId;
    (socket.data as Record<string, string>).playerName = playerName;

    socket.emit('server:join-room-success', {
      roomId,
      playerId: socket.id,
      players: result.players.map(p => ({
        id: p.socketId,
        name: p.name,
        isHost: p.socketId === result.hostId,
      })),
    });

    broadcastRoomUpdate(io, result);
  });

  socket.on('client:leave-room', (data: { roomId: string }) => {
    handlePlayerLeave(io, socket, data.roomId);
  });

  socket.on('client:start-game', (data: { roomId: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room) {
      socket.emit('server:error', { message: 'Phòng không tồn tại!' });
      return;
    }
    if (room.hostId !== socket.id) {
      socket.emit('server:error', { message: 'Chỉ chủ phòng mới bắt đầu được!' });
      return;
    }
    if (room.players.length < 2) {
      socket.emit('server:error', { message: 'Cần ít nhất 2 người chơi!' });
      return;
    }

    gameManager.startGame(room);
    broadcastGameState(io, room);
    startTurnTimer(io, room);
  });

  socket.on('client:declare-sam', (data: { roomId: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room || !room.gameState) return;

    const result = gameManager.declareSam(room, socket.id);
    if (!result.success) {
      socket.emit('server:error', { message: result.error! });
      return;
    }

    broadcastGameState(io, room);
    startTurnTimer(io, room);
  });

  socket.on('client:skip-sam', (data: { roomId: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room || !room.gameState) return;

    const result = gameManager.skipSam(room, socket.id);
    if (!result.success) {
      socket.emit('server:error', { message: result.error! });
      return;
    }

    broadcastGameState(io, room);
    startTurnTimer(io, room);
  });

  socket.on('client:play-cards', (data: { roomId: string; cardIds: string[] }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room || !room.gameState) return;

    // Route to appropriate handler based on phase
    if (room.gameState.phase === 'sam_playing') {
      if (room.gameState.samPlayerId === socket.id) {
        // Sam player is playing
        const result = gameManager.processSamPlay(room, socket.id, data.cardIds);
        if (!result.success) {
          socket.emit('server:error', { message: result.error! });
          return;
        }
      } else {
        // Other player is challenging
        const result = gameManager.processSamChallenge(room, socket.id, data.cardIds);
        if (!result.success) {
          socket.emit('server:error', { message: result.error! });
          return;
        }
      }
    } else {
      const result = gameManager.processPlay(room, socket.id, data.cardIds);
      if (!result.success) {
        socket.emit('server:error', { message: result.error! });
        return;
      }
    }

    broadcastGameState(io, room);
    startTurnTimer(io, room);
  });

  socket.on('client:pass', (data: { roomId: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room || !room.gameState) return;

    if (room.gameState.phase === 'sam_playing') {
      const result = gameManager.processSamPass(room, socket.id);
      if (!result.success) {
        socket.emit('server:error', { message: result.error! });
        return;
      }
    } else {
      const result = gameManager.processPass(room, socket.id);
      if (!result.success) {
        socket.emit('server:error', { message: result.error! });
        return;
      }
    }

    broadcastGameState(io, room);
    startTurnTimer(io, room);
  });

  socket.on('client:new-game', (data: { roomId: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('server:error', { message: 'Chỉ chủ phòng mới bắt đầu ván mới!' });
      return;
    }

    const previousWinner = room.gameState?.winnerId ?? undefined;
    gameManager.startGame(room, previousWinner);
    broadcastGameState(io, room);
    startTurnTimer(io, room);
  });

  socket.on('disconnect', () => {
    const room = roomManager.getPlayerRoom(socket.id);
    if (room) {
      handlePlayerLeave(io, socket, room.id);
    }
  });
}

function handlePlayerLeave(io: Server, socket: Socket, roomId: string) {
  const playerName = (socket.data as Record<string, string>).playerName || 'Unknown';
  const room = roomManager.removePlayer(roomId, socket.id);
  socket.leave(roomId);

  if (!room) {
    clearTurnTimer(roomId);
    return;
  }

  if (room.players.length === 0) {
    clearTurnTimer(roomId);
    return;
  }

  // Notify about disconnection
  io.to(roomId).emit('server:player-disconnected', { playerName });

  broadcastRoomUpdate(io, room);

  // If game is in progress, broadcast updated state
  if (room.gameState && (room.gameState.phase === 'playing' || room.gameState.phase === 'sam_playing')) {
    broadcastGameState(io, room);
  }
}
