'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function IndonesianClock({ 
  showIcon = true, 
  className = "",
  variant = "default"
}: { 
  showIcon?: boolean; 
  className?: string;
  variant?: "default" | "compact" | "badge";
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

  if (variant === "compact") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium ${className}`}>
        {showIcon && <Clock className="w-3.5 h-3.5 text-blue-600" />}
        <span>{dateStr} • {timeStr}</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs ${className}`}>
      {showIcon && <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />}
      <span className="font-medium text-slate-600 truncate">{dateStr}</span>
      <span className="text-slate-300">•</span>
      <span className="font-bold text-slate-900 font-mono tracking-tight shrink-0">{timeStr}</span>
    </div>
  );
}
