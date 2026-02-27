import type { GameStatePayload } from '../types/socket-events';

interface SamDeclarationProps {
  gameState: GameStatePayload;
  onDeclareSam: () => void;
  onSkipSam: () => void;
}

export default function SamDeclaration({ gameState, onDeclareSam, onSkipSam }: SamDeclarationProps) {
  const me = gameState.players.find(p => p.id === gameState.myPlayerId);
  if (!me) return null;

  if (me.samReady) return null;

  const points = (gameState.players.length - 1) * 20;

  return (
    <div className="fixed bottom-30 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-black/75 border border-[rgba(231,76,60,0.5)] rounded-xl py-2 px-4 z-80 backdrop-blur-[6px] whitespace-nowrap">
      <span className="text-white/80 text-[13px] font-semibold">Báo Sâm? (±{points}đ)</span>
      <button className="py-1.5 px-4 border-none rounded-md text-[13px] font-bold cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-px bg-linear-to-br from-[#e74c3c] to-btn-danger text-white shadow-[0_2px_8px_rgba(231,76,60,0.4)] hover:shadow-[0_4px_12px_rgba(231,76,60,0.6)]" onClick={onDeclareSam}>
        Báo Sâm
      </button>
      <button className="py-1.5 px-4 border border-white/30 rounded-md text-[13px] font-bold cursor-pointer transition-[transform,box-shadow] duration-150 hover:-translate-y-px bg-white/15 text-white hover:bg-white/25" onClick={onSkipSam}>
        Bỏ qua
      </button>
    </div>
  );
}
