"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "../../components/TopBar";
import FilterPills from "../../components/FilterPills";
import ViolationsTable from "../../components/ViolationsTable";
import AddViolationModal from "../../components/AddViolationModal";
import { BASICS } from "../../lib/calc";

export default function ViolationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [basicFilter, setBasicFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/violations");
      if (!res.ok) throw new Error("Failed to load violations");
      const data = await res.json();
      setRows(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/violations/${id}`, { method: "DELETE" });
  };

  const counts = useMemo(() => {
    const c = { all: rows.length, "3x": 0, "2x": 0, "1x": 0, off: 0 };
    rows.forEach((r) => { c[r.zone] = (c[r.zone] || 0) + 1; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => zoneFilter === "all" || r.zone === zoneFilter)
      .filter((r) => basicFilter === "all" || r.basic === basicFilter)
      .filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          (r.code || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.driver || "").toLowerCase().includes(q) ||
          (r.unit || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.points - a.points);
  }, [rows, zoneFilter, basicFilter, search]);

  const activeCount = counts["3x"] + counts["2x"] + counts["1x"];

  return (
    <>
      <TopBar />
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex items-start justify-between gap-6 mb-5 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold">Violations by point contribution</h1>
            <p className="text-[13px] text-muted mt-1">
              {rows.length} violations &middot; {activeCount} active on the record &middot; {counts.off} rolled off &middot; ranked highest first
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, description, driver or unit"
              className="text-[13px] border border-line rounded-md px-3 py-2 w-64"
            />
            <select
              value={basicFilter}
              onChange={(e) => setBasicFilter(e.target.value)}
              className="text-[13px] border border-line rounded-md px-3 py-2"
            >
              <option value="all">All BASICs</option>
              {BASICS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAdd(true)}
              className="text-[13px] font-medium bg-ink text-white rounded-md px-4 py-2"
            >
              + Add violation
            </button>
          </div>
        </div>

        <div className="mb-5">
          <FilterPills
            active={zoneFilter}
            onChange={setZoneFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "3x", label: "High (\u00d73)", count: counts["3x"] },
              { value: "2x", label: "Medium (\u00d72)", count: counts["2x"] },
              { value: "1x", label: "Low (\u00d71)", count: counts["1x"] },
              { value: "off", label: "Rolled off", count: counts.off },
            ]}
          />
        </div>

        {loading ? (
          <div className="text-[13px] text-muted py-16 text-center">Loading violation record...</div>
        ) : loadError ? (
          <div className="text-[13px] text-red py-16 text-center">{loadError}</div>
        ) : (
          <ViolationsTable rows={filtered} onDelete={remove} />
        )}
      </div>

      {showAdd && (
        <AddViolationModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </>
  );
}
