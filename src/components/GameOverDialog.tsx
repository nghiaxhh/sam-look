import type { GamePlayerInfo, SamResult } from '../types/socket-events';

interface GameOverDialogProps {
  winnerId: string;
  players: GamePlayerInfo[];
  onNewGame: () => void;
  onLeaveRoom: () => void;
  isHost: boolean;
  samResult: SamResult | null;
}

export default function GameOverDialog({ winnerId, players, onNewGame, onLeaveRoom, isHost, samResult }: GameOverDialogProps) {
  const winner = players.find(p => p.id === winnerId);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-100 animate-fade-in">
      <div className="bg-linear-to-br from-[#1a3d2e] to-[#2d5a3f] border-2 border-highlight-gold rounded-2xl py-8 px-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-80">
        <h2 className="text-white text-xl mb-3">Kết thúc!</h2>

        {samResult ? (
          <div className={`text-[22px] font-bold mb-5 py-2 px-4 rounded-lg ${
            samResult.success
              ? 'text-[#2ecc71] bg-[rgba(46,204,113,0.15)]'
              : 'text-[#e74c3c] bg-[rgba(231,76,60,0.15)]'
          }`}>
            {samResult.success
              ? `${samResult.samPlayerName} báo sâm thành công!`
              : `${samResult.samPlayerName} bị ${samResult.blockerName} chặn sâm!`}
          </div>
        ) : (
          <div className="text-highlight-gold text-[28px] font-bold mb-5">
            {winner?.name ?? 'Unknown'} thắng!
          </div>
        )}

        <div className="flex flex-col gap-2 mb-6">
          {players.map(p => (
            <div key={p.id} className={`flex justify-between py-2 px-4 rounded-lg text-sm ${
              p.id === winnerId
                ? 'bg-[rgba(255,215,0,0.15)] text-highlight-gold font-bold'
                : 'bg-white/8 text-[#ccc]'
            }`}>
              <span className="font-semibold">{p.name}</span>
              <span className="font-normal">
                {p.id === winnerId
                  ? samResult
                    ? (samResult.success ? 'Sâm thành công' : 'Chặn sâm')
                    : 'Hết bài'
                  : samResult
                    ? ''
                    : `Còn ${p.cardCount} lá`}
              </span>
              <span className={`font-semibold min-w-17.5 text-right ${p.score > 0 ? 'text-[#2ecc71]' : p.score < 0 ? 'text-[#e74c3c]' : ''}`}>
                {p.score > 0 ? `+${p.score}` : p.score} điểm
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 items-center">
          {isHost ? (
            <button className="py-3.5 px-10 border-none rounded-lg text-xl font-bold cursor-pointer text-white bg-btn-primary hover:bg-btn-hover" onClick={onNewGame}>
              Ván mới
            </button>
          ) : (
            <div className="text-white/50 text-sm p-2.5">Đang chờ chủ phòng bắt đầu ván mới...</div>
          )}
        </div>
      </div>
    </div>
  );
}
