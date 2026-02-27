import { useState, type FormEvent } from 'react';
import { useAppContext } from '../context/AppContext';

export default function LoginScreen() {
  const { setPlayerName } = useAppContext();
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length > 0 && trimmed.length <= 20) {
      setPlayerName(trimmed);
    }
  };

  return (
    <div className="w-screen h-screen bg-felt-radial flex items-center justify-center">
      <div className="bg-black/35 border border-white/15 rounded-2xl px-12 py-10 text-center min-w-85 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <h1 className="text-highlight-gold text-[32px] font-bold mb-2">Sâm Lốc Online</h1>
        <p className="text-white/50 text-sm mb-7">Game đánh bài Sâm Lốc nhiều người chơi</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="w-full py-3 px-4 border-2 border-white/20 rounded-lg bg-white/8 text-white text-base outline-none transition-colors duration-200 mb-4 focus:border-highlight-gold placeholder:text-white/35"
            placeholder="Nhập tên của bạn"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-3 border-none rounded-lg bg-btn-primary text-white text-base font-bold cursor-pointer transition-colors duration-200 hover:not-disabled:bg-btn-hover disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={name.trim().length === 0}
          >
            Tiếp tục
          </button>
        </form>
      </div>
    </div>
  );
}
