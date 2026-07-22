'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function IndonesianClock({ 
  showIcon = true, 
  className = "",
}: { 
  showIcon?: boolean; 
  className?: string;
}) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      const d = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      const t = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

      setDateStr(d);
      setTimeStr(`${t} WIB`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!dateStr) return null;

  return (
    <div className={`inline-flex items-center gap-2 bg-[#ffe600] text-black neo-border neo-shadow-sm px-3 py-1.5 text-xs font-black tracking-tight ${className}`}>
      {showIcon && <Clock className="w-4 h-4 text-black animate-spin shrink-0" style={{ animationDuration: '6s' }} />}
      <span className="truncate uppercase">{dateStr}</span>
      <span className="text-black font-black">•</span>
      <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase">{timeStr}</span>
    </div>
  );
}
