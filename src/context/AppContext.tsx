import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomPlayer, RoomUpdatePayload, JoinRoomSuccessPayload, ErrorPayload, GameStatePayload, PlayerDisconnectedPayload } from '../types/socket-events';

type Screen = 'login' | 'lobby' | 'room' | 'game';

interface AppState {
  screen: Screen;
  playerName: string;
  roomId: string | null;
  playerId: string | null;
  hostId: string | null;
  roomPlayers: RoomPlayer[];
  socket: Socket | null;
  gameState: GameStatePayload | null;
  notification: string | null;
}

interface AppContextValue {
  state: AppState;
  setPlayerName: (name: string) => void;
  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  newGame: () => void;
  playCards: (cardIds: string[]) => void;
  pass: () => void;
  declareSam: () => void;
  skipSam: () => void;
  goToLogin: () => void;
  clearNotification: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    screen: 'login',
    playerName: '',
    roomId: null,
    playerId: null,
    hostId: null,
    roomPlayers: [],
    socket: null,
    gameState: null,
    notification: null,
  });

  // Connect socket when player name is set
  useEffect(() => {
    if (!state.playerName || !state.roomId || state.socket) return;

    const socket = io('/', {
      autoConnect: true,
    });

    socket.on('connect', () => {
      setState(s => ({ ...s, socket, playerId: socket.id ?? null }));
      socket.emit('client:join-room', {
        playerName: state.playerName,
        roomId: state.roomId!,
      });
    });

    socket.on('server:join-room-success', (data: JoinRoomSuccessPayload) => {
      setState(s => ({
        ...s,
        screen: 'room',
        roomId: data.roomId,
        playerId: data.playerId,
        roomPlayers: data.players,
        hostId: data.players.find(p => p.isHost)?.id ?? null,
      }));
    });

    socket.on('server:room-update', (data: RoomUpdatePayload) => {
      setState(s => ({
        ...s,
        roomPlayers: data.players,
        hostId: data.hostId,
      }));
    });

    socket.on('server:game-state', (data: GameStatePayload) => {
      setState(s => ({
        ...s,
        screen: 'game',
        gameState: data,
        hostId: data.hostId,
      }));
    });

    socket.on('server:error', (data: ErrorPayload) => {
      setState(s => ({ ...s, notification: data.message }));
    });

    socket.on('server:player-disconnected', (data: PlayerDisconnectedPayload) => {
      setState(s => ({ ...s, notification: `${data.playerName} đã rời phòng` }));
    });

    socket.on('disconnect', () => {
      setState(s => ({
        ...s,
        notification: 'Mất kết nối server!',
      }));
    });

    setState(s => ({ ...s, socket }));

    return () => {
      socket.disconnect();
    };
  }, [state.playerName, state.roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPlayerName = useCallback((name: string) => {
    setState(s => ({ ...s, playerName: name.trim(), screen: 'lobby' }));
  }, []);

  const createRoom = useCallback(() => {
    const id = String(Math.floor(10 + Math.random() * 90));
    setState(s => ({ ...s, roomId: id }));
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    if (state.socket) {
      // Already connected, just emit join
      state.socket.emit('client:join-room', {
        playerName: state.playerName,
        roomId,
      });
    } else {
      // Set roomId to trigger socket connection
      setState(s => ({ ...s, roomId }));
    }
  }, [state.socket, state.playerName]);

  const leaveRoom = useCallback(() => {
    if (state.socket && state.roomId) {
      state.socket.emit('client:leave-room', { roomId: state.roomId });
    }
    if (state.socket) {
      state.socket.disconnect();
    }
    setState(s => ({
      ...s,
      screen: 'lobby',
      roomId: null,
      playerId: null,
      hostId: null,
      roomPlayers: [],
      socket: null,
      gameState: null,
      notification: null,
    }));
  }, [state.socket, state.roomId]);

  const startGame = useCallback(() => {
    if (!state.socket || !state.roomId) return;
    state.socket.emit('client:start-game', { roomId: state.roomId });
  }, [state.socket, state.roomId]);

  const newGame = useCallback(() => {
    if (!state.socket || !state.roomId) return;
    state.socket.emit('client:new-game', { roomId: state.roomId });
  }, [state.socket, state.roomId]);

  const playCards = useCallback((cardIds: string[]) => {
    if (!state.socket || !state.roomId) return;
    state.socket.emit('client:play-cards', { roomId: state.roomId, cardIds });
  }, [state.socket, state.roomId]);

  const pass = useCallback(() => {
    if (!state.socket || !state.roomId) return;
    state.socket.emit('client:pass', { roomId: state.roomId });
  }, [state.socket, state.roomId]);

  const declareSam = useCallback(() => {
    if (!state.socket || !state.roomId) return;
    state.socket.emit('client:declare-sam', { roomId: state.roomId });
  }, [state.socket, state.roomId]);

  const skipSam = useCallback(() => {
    if (!state.socket || !state.roomId) return;
    state.socket.emit('client:skip-sam', { roomId: state.roomId });
  }, [state.socket, state.roomId]);

  const goToLogin = useCallback(() => {
    if (state.socket) {
      state.socket.disconnect();
    }
    setState({
      screen: 'login',
      playerName: '',
      roomId: null,
      playerId: null,
      hostId: null,
      roomPlayers: [],
      socket: null,
      gameState: null,
      notification: null,
    });
  }, [state.socket]);

  const clearNotification = useCallback(() => {
    setState(s => ({ ...s, notification: null }));
  }, []);

  return (
    <AppContext.Provider value={{
      state,
      setPlayerName,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      newGame,
      playCards,
      pass,
      declareSam,
      skipSam,
      goToLogin,
      clearNotification,
    }}>
      {children}
    </AppContext.Provider>
  );
}
