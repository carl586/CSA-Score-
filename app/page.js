"use client";

import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import DashboardBlocks from "../components/DashboardBlocks";
import DashboardChart from "../components/DashboardChart";
import { BASICS } from "../lib/calc";

export default function DashboardPage() {
  const [data, setData] = useState({
    categories: [],
    timeline: [],
    upcoming: null,
  });
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

  const up = data.upcoming;

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
            {/* Upcoming weight drops — sits above the BASIC blocks */}
            {up && (
              <div className="mb-5 rounded-lg border border-line bg-panel px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <div className="text-[11px] text-muted uppercase tracking-wide font-semibold">
                    Rolling off in {up.nextMonthLabel}
                  </div>
                  <div className="text-[22px] font-semibold mt-0.5">
                    −{up.pointsDropping}{" "}
                    <span className="text-[13px] font-normal text-muted">
                      points ({up.violationCount} violation{up.violationCount === 1 ? "" : "s"})
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-[13px]">
                  {up.to2x > 0 && (
                    <div>
                      <span className="text-muted">×3 → ×2</span>{" "}
                      <span className="font-semibold">−{up.to2x}</span>
                    </div>
                  )}
                  {up.to1x > 0 && (
                    <div>
                      <span className="text-muted">×2 → ×1</span>{" "}
                      <span className="font-semibold">−{up.to1x}</span>
                    </div>
                  )}
                  {up.off > 0 && (
                    <div>
                      <span className="text-muted">×1 → off</span>{" "}
                      <span className="font-semibold">−{up.off}</span>
                    </div>
                  )}
                  {up.pointsDropping === 0 && (
                    <div className="text-muted">No weight changes next month</div>
                  )}
                </div>
              </div>
            )}

            <DashboardBlocks
              categories={data.categories}
              selected={selected}
              onSelect={setSelected}
            />

            <DashboardChart
              timeline={data.timeline}
              selected={selected}
              onSelect={setSelected}
            />
          </>
        )}
      </div>
    </>
  );
}
