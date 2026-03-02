import type { GamePlayerInfo, SamResult } from '../types/socket-events';

interface GameOverDialogProps {
  winnerId: string;
  players: GamePlayerInfo[];
  onNewGame: () => void;
  onReady: () => void;
  onLeaveRoom: () => void;
  isHost: boolean;
  samResult: SamResult | null;
  readyPlayerIds: string[];
  myPlayerId: string;
  allReady: boolean;
}

export default function GameOverDialog({ winnerId, players, onNewGame, onReady, onLeaveRoom, isHost, samResult, readyPlayerIds, myPlayerId, allReady }: GameOverDialogProps) {
  const winner = players.find(p => p.id === winnerId);
  const isReady = readyPlayerIds.includes(myPlayerId);
  const readyCount = readyPlayerIds.length;
  const nonHostCount = players.length - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-100 animate-slide-up pointer-events-none">
      <div className="bg-linear-to-br from-[#1a3d2e]/95 to-[#2d5a3f]/95 border-2 border-b-0 border-highlight-gold rounded-t-2xl py-5 px-8 text-center shadow-[0_-4px_32px_rgba(0,0,0,0.5)] min-w-80 max-w-150 backdrop-blur-sm pointer-events-auto">
        <h2 className="text-white text-lg mb-2">Kết thúc!</h2>

        {samResult ? (
          <div className={`text-lg font-bold mb-3 py-1.5 px-4 rounded-lg ${
            samResult.success
              ? 'text-[#2ecc71] bg-[rgba(46,204,113,0.15)]'
              : 'text-[#e74c3c] bg-[rgba(231,76,60,0.15)]'
          }`}>
            {samResult.success
              ? `${samResult.samPlayerName} báo sâm thành công!`
              : `${samResult.samPlayerName} bị ${samResult.blockerName} chặn sâm!`}
          </div>
        ) : (
          <div className="text-highlight-gold text-[22px] font-bold mb-3">
            {winner?.name ?? 'Unknown'} thắng!
          </div>
        )}

        <div className="flex flex-col gap-1.5 mb-4">
          {players.map(p => (
            <div key={p.id} className={`flex justify-between items-center py-1.5 px-4 rounded-lg text-sm ${
              p.id === winnerId
                ? 'bg-[rgba(255,215,0,0.15)] text-highlight-gold font-bold'
                : 'bg-white/8 text-[#ccc]'
            }`}>
              <span className="font-semibold">{p.name}</span>
              <span className={`font-normal ${p.id !== winnerId && !samResult && p.cardCount === 10 ? 'text-[#e74c3c] font-semibold' : ''}`}>
                {p.id === winnerId
                  ? samResult
                    ? (samResult.success ? 'Sâm thành công' : 'Chặn sâm')
                    : 'Hết bài'
                  : samResult
                    ? ''
                    : p.cardCount === 10
                      ? 'Thua cháy!'
                      : `Còn ${p.cardCount} lá`}
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold min-w-17.5 text-right ${p.score > 0 ? 'text-[#2ecc71]' : p.score < 0 ? 'text-[#e74c3c]' : ''}`}>
                  {p.score > 0 ? `+${p.score}` : p.score} điểm
                </span>
                {readyPlayerIds.includes(p.id) && (
                  <span className="text-[#2ecc71] text-xs">&#10003;</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 items-center">
          {isHost ? (
            <div className="flex flex-col items-center gap-1.5">
              <button
                className={`py-3 px-8 border-none rounded-lg text-lg font-bold cursor-pointer text-white transition-colors duration-200 ${
                  allReady
                    ? 'bg-btn-primary hover:bg-btn-hover'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
                onClick={onNewGame}
                disabled={!allReady}
              >
                Ván mới
              </button>
              {!allReady && (
                <div className="text-white/50 text-xs">Đang chờ người chơi sẵn sàng ({readyCount}/{nonHostCount})</div>
              )}
            </div>
          ) : isReady ? (
            <div className="text-[#2ecc71] text-sm p-2 font-semibold">Đã sẵn sàng! Đang chờ chủ phòng...</div>
          ) : (
            <button className="py-3 px-8 border-none rounded-lg text-lg font-bold cursor-pointer text-white bg-[#27ae60] hover:bg-[#2ecc71] transition-colors duration-200" onClick={onReady}>
              Sẵn sàng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
