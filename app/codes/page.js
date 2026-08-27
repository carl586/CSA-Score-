"use client";

import { useEffect, useState } from "react";
import TopBar from "../../components/TopBar";
import ViolationCodesTable from "../../components/ViolationCodesTable";
import AddViolationCodeModal from "../../components/AddViolationCodeModal";

export default function ViolationCodesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/violation-codes");
      if (!res.ok) throw new Error("Failed to load violation codes");
      setRows(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/violation-codes/${id}`, { method: "DELETE" });
  };

  return (
    <>
      <TopBar />
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex items-start justify-between gap-6 mb-5 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold">Violation codes</h1>
            <p className="text-[13px] text-muted mt-1">{rows.length} codes on file</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-[13px] font-medium bg-ink text-white rounded-md px-4 py-2"
          >
            + Add code
          </button>
        </div>

        {loading ? (
          <div className="text-[13px] text-muted py-16 text-center">Loading...</div>
        ) : error ? (
          <div className="text-[13px] text-red py-16 text-center">{error}</div>
        ) : (
          <ViolationCodesTable rows={rows} onDelete={remove} />
        )}
      </div>

      {showAdd && (
        <AddViolationCodeModal
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
