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
import { BASICS } from "../lib/calc";

export default function DashboardChart({ timeline, selected, onSelect }) {
  return (
    <div className="border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="text-[13px] font-medium">Points added vs. rolled off</div>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="text-[13px] border border-line rounded-md px-3 py-1.5 bg-white"
        >
          <option value="all">All BASICs</option>
          {BASICS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E9EC" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
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
