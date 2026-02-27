import { AppProvider, useAppContext } from './context/AppContext';
import { useGameState } from './hooks/useGameState';
import LoginScreen from './components/LoginScreen';
import LobbyScreen from './components/LobbyScreen';
import RoomScreen from './components/RoomScreen';
import GameBoard from './components/GameBoard';

function GameScreen() {
  const { state, playCards, pass, newGame, leaveRoom, declareSam, skipSam } = useAppContext();

  const {
    selectedCardIds,
    toggleCardSelection,
    handlePlay,
    handlePass,
    canPlay,
    canPass,
    isMyTurn,
    isHost,
    isSamPlayer,
    errorMessage,
  } = useGameState(state.gameState, playCards, pass);

  if (!state.gameState) {
    return <div style={{ color: '#fff', textAlign: 'center', paddingTop: '40vh' }}>Đang tải...</div>;
  }

  return (
    <GameBoard
      gameState={state.gameState}
      selectedCardIds={selectedCardIds}
      onCardClick={toggleCardSelection}
      onPlay={handlePlay}
      onPass={handlePass}
      onNewGame={newGame}
      onLeaveRoom={leaveRoom}
      onDeclareSam={declareSam}
      onSkipSam={skipSam}
      canPlay={canPlay}
      canPass={canPass}
      isMyTurn={isMyTurn}
      isHost={isHost}
      isSamPlayer={isSamPlayer}
      errorMessage={errorMessage}
    />
  );
}

function AppRouter() {
  const { state } = useAppContext();

  switch (state.screen) {
    case 'login': return <LoginScreen />;
    case 'lobby': return <LobbyScreen />;
    case 'room': return <RoomScreen />;
    case 'game': return <GameScreen />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
