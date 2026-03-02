import { useState, useEffect } from 'react';

interface TurnTimerProps {
  deadline: number;
  active: boolean;
}

export default function TurnTimer({ deadline, active }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(15);

  useEffect(() => {
    if (!active) return;

    const update = () => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      setRemaining(left);
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [deadline, active]);

  if (!active) return null;

  const fraction = remaining / 15;
  const isUrgent = remaining < 5;

  return (
    <div className="flex items-center gap-2 w-40">
      <div className="flex-1 h-1.5 bg-white/15 rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-[width] duration-100 ease-linear ${isUrgent ? 'bg-btn-danger' : 'bg-[#2ecc71]'}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span className={`text-[13px] font-bold min-w-7 text-right tabular-nums ${isUrgent ? 'text-btn-danger' : 'text-white/70'}`}>
        {Math.ceil(remaining)}s
      </span>
    </div>
  );
}
