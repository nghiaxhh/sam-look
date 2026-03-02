import type { Card as CardType } from '../types/game';
import type { GameStatePayload } from '../types/socket-events';
import PlayerArea from './PlayerArea';
import Card from './Card';
import GameControls from './GameControls';
import GameOverDialog from './GameOverDialog';
import SamDeclaration from './SamDeclaration';
import TurnTimer from './TurnTimer';

type Position = 'bottom' | 'left' | 'top' | 'right' | 'top-left' | 'top-right';

function getPositions(playerCount: number): Position[] {
  switch (playerCount) {
    case 2: return ['bottom', 'top'];
    case 3: return ['bottom', 'left', 'right'];
    case 5: return ['bottom', 'left', 'top-left', 'top-right', 'right'];
    default: return ['bottom', 'left', 'top', 'right'];
  }
}

interface GameBoardProps {
  gameState: GameStatePayload;
  selectedCardIds: Set<string>;
  onCardClick: (card: CardType) => void;
  onPlay: () => void;
  onPass: () => void;
  onNewGame: () => void;
  onReady: () => void;
  onLeaveRoom: () => void;
  onDeclareSam: () => void;
  onSkipSam: () => void;
  canPlay: boolean;
  canPass: boolean;
  isMyTurn: boolean;
  isHost: boolean;
  isSamPlayer: boolean;
  errorMessage: string | null;
}

export default function GameBoard({
  gameState,
  selectedCardIds,
  onCardClick,
  onPlay,
  onPass,
  onNewGame,
  onReady,
  onLeaveRoom,
  onDeclareSam,
  onSkipSam,
  canPlay,
  canPass,
  isMyTurn,
  isHost,
  isSamPlayer,
  errorMessage,
}: GameBoardProps) {
  const isGameOver = gameState.phase === 'game_over';
  const isSamPhase = gameState.phase === 'sam_playing';

  // All non-host players must be ready for host to start new game
  const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
  const allReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => gameState.readyPlayerIds.includes(p.id));

  const myIndex = gameState.players.findIndex(p => p.id === gameState.myPlayerId);
  const playerCount = gameState.players.length;
  const positions = getPositions(playerCount);

  const orderedPlayers = [];
  for (let i = 0; i < playerCount; i++) {
    const idx = (myIndex + i) % playerCount;
    orderedPlayers.push({
      player: gameState.players[idx],
      position: positions[i],
      isMe: i === 0,
    });
  }

  const samPlayerName = gameState.samPlayerId
    ? gameState.players.find(p => p.id === gameState.samPlayerId)?.name
    : null;

  return (
    <div className={`w-screen h-screen bg-felt-radial grid gap-0 p-2 relative game-board-grid players-${playerCount}`}>
      {/* Scoreboard */}
      <div className="fixed top-2.5 right-2.5 bg-black/60 border border-white/15 rounded-[10px] py-2 px-3 z-50 min-w-30 backdrop-blur-sm">
        <div className="text-white/50 text-[11px] font-semibold text-center mb-1.5 uppercase tracking-wider">Điểm</div>
        {gameState.players.map(p => (
          <div key={p.id} className={`flex justify-between items-center py-0.75 text-xs ${p.id === gameState.myPlayerId ? 'text-highlight-gold font-bold' : 'text-white/70'}`}>
            <span className="mr-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-20">{p.name}</span>
            <span className={`font-bold tabular-nums ${p.score > 0 ? 'text-[#2ecc71]' : p.score < 0 ? 'text-[#e74c3c]' : ''}`}>
              {p.score > 0 ? `+${p.score}` : p.score}
            </span>
          </div>
        ))}
      </div>

      {orderedPlayers.map(({ player, position, isMe }) => (
        <PlayerArea
          key={player.id}
          player={player}
          myHand={isMe ? gameState.myHand : undefined}
          revealedHand={isGameOver && !isMe && gameState.revealedHands?.[player.id] || undefined}
          isCurrentTurn={gameState.currentPlayerId === player.id && !isGameOver}
          isMe={isMe}
          position={position}
          selectedCardIds={isMe ? selectedCardIds : undefined}
          onCardClick={isMe && isMyTurn ? onCardClick : undefined}
          showCardCount={isGameOver}
        />
      ))}

      {/* Trick area */}
      <div className="grid-area-center flex flex-col items-center justify-center gap-3 relative">
        <TurnTimer
          deadline={gameState.turnDeadline}
          active={!isGameOver}
        />

        {isSamPhase && samPlayerName && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-linear-to-br from-[#e74c3c] to-btn-danger text-white py-2 px-6 rounded-[20px] text-[15px] font-bold z-50 shadow-[0_4px_16px_rgba(231,76,60,0.5)] animate-sam-banner-pulse">
            {samPlayerName} đang báo sâm!
          </div>
        )}

        {gameState.currentTrick ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-white/70 text-xs">
              {gameState.currentTrick.playerName}
            </div>
            <div className="flex gap-1">
              {gameState.currentTrick.combination.cards.map(card => (
                <Card key={card.id} card={card} faceUp />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-white/30 text-base italic">
            {gameState.phase === 'declaring'
              ? 'Đang chờ báo sâm...'
              : isSamPhase
                ? 'Đánh tự do (Sâm)'
                : gameState.gameLog.length === 0
                  ? 'Bắt đầu ván mới'
                  : 'Đánh tự do'}
          </div>
        )}
      </div>

      <GameControls
        onPlay={onPlay}
        onPass={onPass}
        onNewGame={onNewGame}
        onLeaveRoom={onLeaveRoom}
        canPlay={canPlay}
        canPass={canPass}
        isMyTurn={isMyTurn}
        isHost={isHost}
        gamePhase={gameState.phase}
        errorMessage={errorMessage}
        isSamPhase={isSamPhase}
        isSamPlayer={isSamPlayer}
      />

      {gameState.phase === 'declaring' && (
        <SamDeclaration
          gameState={gameState}
          onDeclareSam={onDeclareSam}
          onSkipSam={onSkipSam}
        />
      )}

      {isGameOver && gameState.winnerId !== null && (
        <GameOverDialog
          winnerId={gameState.winnerId}
          players={gameState.players}
          onNewGame={onNewGame}
          onReady={onReady}
          onLeaveRoom={onLeaveRoom}
          isHost={isHost}
          samResult={gameState.samResult}
          readyPlayerIds={gameState.readyPlayerIds}
          myPlayerId={gameState.myPlayerId}
          allReady={allReady}
        />
      )}
    </div>
  );
}
