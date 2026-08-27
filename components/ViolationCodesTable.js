import { BASIC_LABEL } from "../lib/calc";

export default function ViolationCodesTable({ rows, onDelete }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-[13px] text-muted py-16 border border-dashed border-line rounded-lg">
        No violation codes yet.
      </div>
    );
  }

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_1.6fr_1fr_1fr_90px_32px] gap-3 px-4 py-2.5 bg-panel text-[11px] font-semibold tracking-wide text-muted uppercase">
        <span>Code</span>
        <span>Description</span>
        <span>Basic</span>
        <span>Group</span>
        <span>Severity</span>
        <span />
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          className="grid grid-cols-[1fr_1.6fr_1fr_1fr_90px_32px] gap-3 px-4 py-3 items-center border-t border-line text-[13px]"
        >
          <span className="font-medium">{r.code}</span>
          <span className="text-muted truncate">{r.description || "—"}</span>
          <span className="text-muted text-[12px]">{BASIC_LABEL[r.basic] || r.basic}</span>
          <span className="text-muted text-[12px]">{r.violation_group || "—"}</span>
          <span className="font-mono font-semibold">{r.severity_weight}</span>
          <button
            onClick={() => onDelete(r.id)}
            className="text-muted hover:text-red text-[16px] leading-none"
            title="Delete"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
