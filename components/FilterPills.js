export default function FilterPills({ options, active, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((opt) => {
        const isActive = active === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={
              "text-[13px] px-3.5 py-1.5 rounded-full border transition-colors " +
              (isActive
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink border-line hover:border-ink")
            }
          >
            {opt.label} <span className={isActive ? "opacity-70" : "text-muted"}>{opt.count}</span>
          </button>
        );
      })}
    </div>
  );
}
