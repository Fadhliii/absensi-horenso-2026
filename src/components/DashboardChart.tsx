'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function DashboardChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-[#fffde7] neo-border">
        <span className="text-black font-black uppercase text-xs">Belum ada data grafik</span>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#000000" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#000000', fontWeight: 900 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#000000', fontWeight: 900 }} 
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
            allowDecimals={false}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const dataPoint = payload[0].payload;
                return (
                  <div className="bg-white p-3 border-3 border-black box-shadow-4px">
                    <p className="text-xs font-black text-black uppercase mb-2 border-b-2 border-black pb-1">{label}</p>
                    <p className="text-sm font-black text-black">Persentase: {dataPoint.Persentase}%</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-bold text-gray-700">✅ Hadir: {dataPoint.Hadir || 0}</p>
                      <p className="text-xs font-bold text-gray-700">✉️ Izin: {dataPoint.Izin || 0}</p>
                      <p className="text-xs font-bold text-gray-700">🤒 Sakit: {dataPoint.Sakit || 0}</p>
                      <p className="text-xs font-bold text-gray-700">❌ Bolos/Alpha: {dataPoint.Bolos || 0}</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="Persentase" 
            stroke="#000000" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorHadir)" 
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#000', fill: '#00f0ff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
