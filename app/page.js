"use client";

import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import DashboardBlocks from "../components/DashboardBlocks";
import DashboardChart from "../components/DashboardChart";

export default function DashboardPage() {
  const [data, setData] = useState({ categories: [], timeline: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("all");

  const load = async (basic) => {
    setLoading(true);
    setError("");
    try {
      const qs = basic && basic !== "all" ? `?basic=${basic}` : "";
      const res = await fetch(`/api/dashboard/summary${qs}`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(selected);
  }, [selected]);

  return (
    <>
      <TopBar />
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="mb-5">
          <h1 className="text-[22px] font-semibold">Dashboard</h1>
          <p className="text-[13px] text-muted mt-1">
            Active points by category, and how the record is changing month to month
          </p>
        </div>

        {loading ? (
          <div className="text-[13px] text-muted py-16 text-center">Loading...</div>
        ) : error ? (
          <div className="text-[13px] text-red py-16 text-center">{error}</div>
        ) : (
          <>
            <DashboardBlocks categories={data.categories} selected={selected} onSelect={setSelected} />
            <DashboardChart timeline={data.timeline} />
          </>
        )}
      </div>
    </>
  );
}
