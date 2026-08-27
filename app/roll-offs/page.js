"use client";

import { useEffect, useState } from "react";
import TopBar from "../../components/TopBar";
import { BASICS } from "../../lib/calc";

function nextMonthLabel() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function RollOffsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [basic, setBasic] = useState("all");
  const [months, setMonths] = useState(1);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (basic !== "all") qs.set("basic", basic);
      qs.set("months", String(months));
      const res = await fetch(`/api/roll-offs?${qs}`);
      if (!res.ok) throw new Error("Failed to load roll-offs");
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [basic, months]);

  return (
    <>
      <TopBar />
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-[22px] font-semibold">Rolling off</h1>
            <p className="text-[13px] text-muted mt-1">
              Upcoming weight changes and points that leave the record
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="text-[13px] border border-line rounded-md px-3 py-1.5 bg-white"
            >
              <option value={1}>Next {nextMonthLabel()}</option>
              <option value={3}>Next 3 months</option>
              <option value={6}>Next 6 months</option>
              <option value={12}>Next 12 months</option>
              <option value={24}>Next 24 months</option>
            </select>
            <select
              value={basic}
              onChange={(e) => setBasic(e.target.value)}
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
        </div>

        {loading ? (
          <div className="text-[13px] text-muted py-16 text-center">Loading...</div>
        ) : error ? (
          <div className="text-[13px] text-red py-16 text-center">{error}</div>
        ) : !data || data.events.length === 0 ? (
          <div className="text-[13px] text-muted py-16 text-center border border-dashed border-line rounded-lg">
            No weight changes in this window.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-line p-3">
                <div className="text-[11px] text-muted mb-1">Events</div>
                <div className="text-[20px] font-semibold">{data.totalEvents}</div>
              </div>
              <div className="rounded-lg border border-line p-3">
                <div className="text-[11px] text-muted mb-1">Total points dropping</div>
                <div className="text-[20px] font-semibold text-red">−{data.totalPointsDrop}</div>
              </div>
            </div>

            <div className="mb-6 border border-line rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-panel text-[11px] font-semibold tracking-wide text-muted uppercase">
                By month
              </div>
              {data.summary.map((m) => (
                <div
                  key={m.monthKey}
                  className="flex items-center justify-between px-4 py-2.5 border-t border-line text-[13px]"
                >
                  <span>{m.monthLabel}</span>
                  <span className="text-muted">
                    {m.count} event{m.count === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-ink">−{m.pointsDrop} pts</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="border border-line rounded-lg overflow-hidden">
              <div className="grid grid-cols-[100px_1.2fr_1fr_90px_100px_90px_100px_80px] gap-2 px-4 py-2.5 bg-panel text-[11px] font-semibold tracking-wide text-muted uppercase">
                <span>When</span>
                <span>Violation</span>
                <span>BASIC</span>
                <span>Transition</span>
                <span>Current pts</span>
                <span>Drop</span>
                <span>Driver / unit</span>
                <span>In</span>
              </div>
              {data.events.map((e) => (
                <div
                  key={`${e.id}-${e.transitionAt}-${e.transitionLabel}`}
                  className="grid grid-cols-[100px_1.2fr_1fr_90px_100px_90px_100px_80px] gap-2 px-4 py-3 items-center border-t border-line text-[13px]"
                >
                  <span className="font-mono text-[12px] text-muted">
                    {new Date(e.transitionAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-1.5">
                      {e.code || "—"}
                      {e.oos && (
                        <span className="text-[9px] font-bold text-red border border-red/40 rounded px-1">
                          OOS
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted truncate">{e.description || "—"}</div>
                  </div>
                  <span className="text-[12px] text-muted truncate">{e.basicLabel}</span>
                  <span className="text-[12px] font-medium">{e.transitionLabel}</span>
                  <span className="font-mono">{e.currentPoints}</span>
                  <span className="font-mono font-semibold text-red">−{e.pointsDrop}</span>
                  <span className="text-[12px] text-muted truncate">
                    {[e.driver, e.unit].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span className="text-[12px] text-muted">{e.daysUntil}d</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
