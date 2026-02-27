import { useState, useEffect, type FormEvent } from 'react';
import { useAppContext } from '../context/AppContext';

export default function LobbyScreen() {
  const { state, createRoom, joinRoom, goToLogin, clearNotification } = useAppContext();
  const [roomId, setRoomId] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(clearNotification, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notification, clearNotification]);

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = roomId.trim();
    if (trimmed.length > 0) {
      joinRoom(trimmed);
    }
  };

  const inputClasses = "w-full py-3 px-4 border-2 border-white/20 rounded-lg bg-white/8 text-white text-base outline-none transition-colors duration-200 mb-3 focus:border-highlight-gold placeholder:text-white/35";
  const btnBase = "w-full py-3 border-none rounded-lg text-white text-base font-bold cursor-pointer transition-[background,transform] duration-200 hover:not-disabled:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="w-screen h-screen bg-felt-radial flex items-center justify-center">
      <div className="bg-black/35 border border-white/15 rounded-2xl px-12 py-10 text-center min-w-85 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="text-white text-xl mb-6">
          Xin chào, <span className="text-highlight-gold font-bold">{state.playerName}</span>!
        </div>

        {!showJoin ? (
          <div className="flex flex-col gap-3">
            <button className={`${btnBase} bg-[#27ae60] hover:not-disabled:bg-[#2ecc71]`} onClick={createRoom}>
              Tạo phòng
            </button>
            <button className={`${btnBase} bg-[#2980b9] hover:not-disabled:bg-[#3498db]`} onClick={() => setShowJoin(true)}>
              Vào bàn
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={inputClasses}
              placeholder="Nhập số phòng"
              value={roomId}
              onChange={e => setRoomId(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              autoFocus
            />
            <button
              type="submit"
              className={`${btnBase} bg-[#2980b9] hover:not-disabled:bg-[#3498db] mb-3`}
              disabled={roomId.trim().length === 0}
            >
              Vào phòng
            </button>
            <button
              type="button"
              className="bg-transparent border-none text-white/50 text-[13px] cursor-pointer underline block mx-auto hover:text-white"
              onClick={() => setShowJoin(false)}
            >
              Quay lại
            </button>
          </form>
        )}

        {state.notification && (
          <div className="text-[#e74c3c] text-[13px] bg-[rgba(231,76,60,0.15)] py-2 px-3 rounded-md mb-3">{state.notification}</div>
        )}

        <button className="bg-transparent border-none text-white/50 text-[13px] cursor-pointer underline block mx-auto hover:text-white mt-4" onClick={goToLogin}>
          Đổi tên
        </button>
      </div>
    </div>
  );
}
