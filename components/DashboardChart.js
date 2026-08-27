"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function DashboardChart({ timeline }) {
  return (
    <div className="border border-line rounded-lg p-4">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E9EC" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="added" name="Points added" fill="#14161A" radius={[3, 3, 0, 0]} />
          <Bar dataKey="rolledOff" name="Points rolled off" fill="#8A93A0" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
