export default function DashboardBlocks({ categories, selected, onSelect }) {
  const total = Math.round(categories.reduce((s, c) => s + c.points, 0) * 10) / 10;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      <button
        onClick={() => onSelect("all")}
        className={
          "text-left rounded-lg border p-3 " +
          (selected === "all" ? "border-ink bg-panel" : "border-line hover:bg-panel")
        }
      >
        <div className="text-[11px] text-muted mb-1">All categories</div>
        <div className="text-[20px] font-semibold">{total}</div>
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={
            "text-left rounded-lg border p-3 " +
            (selected === c.id ? "border-ink bg-panel" : "border-line hover:bg-panel")
          }
        >
          <div className="text-[11px] text-muted mb-1 leading-tight">{c.label}</div>
          <div className="text-[20px] font-semibold">{c.points}</div>
        </button>
      ))}
    </div>
  );
}
