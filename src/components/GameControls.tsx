interface GameControlsProps {
  onPlay: () => void;
  onPass: () => void;
  onNewGame: () => void;
  onLeaveRoom: () => void;
  canPlay: boolean;
  canPass: boolean;
  isMyTurn: boolean;
  isHost: boolean;
  gamePhase: 'declaring' | 'playing' | 'sam_playing' | 'game_over';
  errorMessage: string | null;
  isSamPhase: boolean;
  isSamPlayer: boolean;
}

const btn = "py-2.5 px-6 border-none rounded-lg text-[15px] font-bold cursor-pointer transition-all duration-200 text-white disabled:opacity-40 disabled:cursor-not-allowed";

export default function GameControls({
  onPlay,
  onPass,
  onNewGame,
  onLeaveRoom,
  canPlay,
  canPass,
  isMyTurn,
  isHost,
  gamePhase,
  errorMessage,
  isSamPhase,
  isSamPlayer,
}: GameControlsProps) {
  if (gamePhase === 'game_over') {
    return (
      <div className="grid-area-controls flex flex-col items-center gap-1.5 p-1.5">
        <div className="flex gap-2.5">
          {isHost ? (
            <button className={`${btn} bg-btn-primary py-3.5 px-10 text-xl hover:bg-btn-hover`} onClick={onNewGame}>
              Ván mới
            </button>
          ) : (
            <span className="text-white/50 text-sm p-2.5">Đang chờ chủ phòng bắt đầu ván mới...</span>
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === 'declaring') {
    return null;
  }

  const turnMessage = isSamPhase
    ? isSamPlayer
      ? 'Lượt của bạn (Sâm)'
      : isMyTurn
        ? 'Chặn hoặc bỏ qua'
        : null
    : isMyTurn
      ? 'Lượt của bạn'
      : null;

  return (
    <div className="grid-area-controls flex flex-col items-center gap-1.5 p-1.5">
      <div className="flex gap-2.5">
        <button
          className={`${btn} ${isSamPhase && !isSamPlayer && isMyTurn ? 'bg-[#e74c3c] hover:not-disabled:bg-btn-danger' : 'bg-[#27ae60] hover:not-disabled:bg-[#2ecc71]'}`}
          onClick={onPlay}
          disabled={!canPlay || !isMyTurn}
        >
          {isSamPhase && !isSamPlayer ? 'Chặn' : 'Đánh'}
        </button>
        <button
          className={`${btn} bg-[#e67e22] hover:not-disabled:bg-[#f39c12]`}
          onClick={onPass}
          disabled={!canPass || !isMyTurn}
        >
          Bỏ lượt
        </button>
      </div>
      {errorMessage && <div className="text-[#e74c3c] text-[13px] font-semibold bg-[rgba(231,76,60,0.15)] py-1 px-3 rounded-md">{errorMessage}</div>}
      {turnMessage && !errorMessage && <div className="text-highlight-gold text-[13px] font-semibold">{turnMessage}</div>}
    </div>
  );
}
