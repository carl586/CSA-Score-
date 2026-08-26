import { BASIC_LABEL } from "../lib/calc";

const ZONE_STYLE = {
  "3x": { text: "text-red", badgeBg: "bg-red/10", badgeText: "text-red", label: "HIGH" },
  "2x": { text: "text-amber", badgeBg: "bg-amber/10", badgeText: "text-amber", label: "MED" },
  "1x": { text: "text-muted", badgeBg: "bg-black/5", badgeText: "text-muted", label: "LOW" },
  off: { text: "text-green", badgeBg: "bg-green/10", badgeText: "text-green", label: "OFF" },
};

export default function ViolationsTable({ rows, onDelete }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-[13px] text-muted py-16 border border-dashed border-line rounded-lg">
        No violations match this filter yet.
      </div>
    );
  }

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <div className="grid grid-cols-[36px_1.6fr_1fr_100px_90px_90px_1.3fr_32px] gap-3 px-4 py-2.5 bg-panel text-[11px] font-semibold tracking-wide text-muted uppercase">
        <span>#</span>
        <span>Violation</span>
        <span>Basic</span>
        <span>Date</span>
        <span>Points</span>
        <span>Zone</span>
        <span>Status</span>
        <span />
      </div>
      {rows.map((v, i) => {
        const s = ZONE_STYLE[v.zone];
        return (
          <div
            key={v.id}
            className="grid grid-cols-[36px_1.6fr_1fr_100px_90px_90px_1.3fr_32px] gap-3 px-4 py-3 items-center border-t border-line text-[13px]"
          >
            <span className="text-muted">{i + 1}</span>
            <div className="min-w-0">
              <div className="font-medium truncate flex items-center gap-2">
                {v.code || "—"}
                {v.oos && (
                  <span className="text-[9px] font-bold tracking-wide text-red border border-red/40 rounded px-1.5 py-0.5">
                    OOS
                  </span>
                )}
              </div>
              <div className="text-muted text-[12px] truncate">{v.description || "—"}</div>
            </div>
            <span className="text-muted text-[12px]">{BASIC_LABEL[v.basic] || v.basic}</span>
            <span className="font-mono text-[12px] text-muted">
              {new Date(v.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
            </span>
            <span className={"font-mono font-semibold " + s.text}>{v.points}</span>
            <span className={"inline-flex justify-center text-[11px] font-semibold rounded px-2 py-0.5 " + s.badgeBg + " " + s.badgeText}>
              {s.label}
            </span>
            <span className="text-muted text-[12px] truncate">
              {v.zone === "off" ? "Rolled off record" : `${v.nextLabel} in ${v.nextDays}d`}
            </span>
            <button
              onClick={() => onDelete(v.id)}
              className="text-muted hover:text-red text-[16px] leading-none"
              title="Delete"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
