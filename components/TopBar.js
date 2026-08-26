export default function TopBar() {
  const today = new Date();
  const nextRun = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex items-center justify-end gap-3 px-8 py-3 border-b border-line text-[12px] text-muted">
      <span>Decay model &middot; recalculated {fmt(today)} &middot; next check {fmt(nextRun)}</span>
      <span className="border border-line rounded-full px-3 py-1 font-medium text-ink">
        All BASICs
      </span>
    </div>
  );
}
