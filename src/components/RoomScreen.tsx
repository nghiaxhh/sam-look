import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export default function RoomScreen() {
  const { state, startGame, leaveRoom, clearNotification } = useAppContext();
  const isHost = state.playerId === state.hostId;
  const canStart = isHost && state.roomPlayers.length >= 2;

  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(clearNotification, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notification, clearNotification]);

  return (
    <div className="w-screen h-screen bg-felt-radial flex items-center justify-center">
      <div className="bg-black/35 border border-white/15 rounded-2xl py-8 px-10 min-w-95 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <h2 className="text-highlight-gold text-[22px] text-center mb-5">Phòng {state.roomId}</h2>

        <div className="flex flex-col gap-2 mb-5">
          {state.roomPlayers.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg text-[15px] ${
                player.id === state.playerId
                  ? 'bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] text-white'
                  : 'bg-white/6 text-[#ccc]'
              }`}
            >
              <span className="font-bold text-white/50 min-w-5">{i + 1}.</span>
              <span className="font-semibold flex-1">{player.name}</span>
              {player.isHost && <span className="text-[11px] bg-highlight-gold text-black py-0.5 px-2 rounded-[10px] font-bold">Chủ phòng</span>}
              {player.id === state.playerId && <span className="text-xs text-white/50">(Bạn)</span>}
            </div>
          ))}
          {Array.from({ length: 5 - state.roomPlayers.length }, (_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-2 py-2.5 px-4 rounded-lg bg-white/6 text-[#ccc] opacity-40">
              <span className="font-bold text-white/50 min-w-5">{state.roomPlayers.length + i + 1}.</span>
              <span className="italic text-white/30">Đang chờ...</span>
            </div>
          ))}
        </div>

        {state.notification && (
          <div className="text-[#e67e22] text-[13px] text-center p-1.5 mb-3">{state.notification}</div>
        )}

        <div className="flex flex-col gap-2.5 items-center">
          {canStart ? (
            <button className="w-full py-3 border-none rounded-lg text-base font-bold cursor-pointer text-white transition-colors duration-200 bg-[#27ae60] hover:bg-[#2ecc71]" onClick={startGame}>
              Bắt đầu
            </button>
          ) : isHost ? (
            <div className="text-white/50 text-sm text-center p-2">Cần ít nhất 2 người để bắt đầu</div>
          ) : (
            <div className="text-white/50 text-sm text-center p-2">Đang chờ chủ phòng bắt đầu...</div>
          )}
        </div>
      </div>
    </div>
  );
}
