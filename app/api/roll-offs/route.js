import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { BASIC_LABEL, addMonths, monthsBetween, timeWeight } from "../../../lib/calc";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const basicFilter = searchParams.get("basic");
    const monthsAhead = Math.min(Number(searchParams.get("months")) || 12, 24);

    const rows = await sql`
      SELECT id, date, code, description, basic, severity, oos, driver, unit
      FROM violations
      ORDER BY date ASC
    `;

    const asOf = new Date();
    const cutoff = addMonths(asOf, monthsAhead);
    const events = [];

    for (const row of rows) {
      if (basicFilter && basicFilter !== "all" && row.basic !== basicFilter) continue;

      const vDate = new Date(row.date);
      const eff = Number(row.severity) + (row.oos ? 2 : 0);
      const weightNow = timeWeight(monthsBetween(vDate, asOf));
      if (weightNow <= 0) continue; // already off

      const transitions = [
        {
          at: addMonths(vDate, 6),
          fromWeight: 3,
          toWeight: 2,
          label: "×3 → ×2",
          pointsDrop: eff, // one weight step
        },
        {
          at: addMonths(vDate, 12),
          fromWeight: 2,
          toWeight: 1,
          label: "×2 → ×1",
          pointsDrop: eff,
        },
        {
          at: addMonths(vDate, 24),
          fromWeight: 1,
          toWeight: 0,
          label: "×1 → off",
          pointsDrop: eff,
        },
      ];

      for (const t of transitions) {
        // only future transitions within window, and only if still at that weight or higher
        if (t.at <= asOf || t.at > cutoff) continue;
        if (weightNow < t.fromWeight) continue;

        const daysUntil = Math.ceil((t.at - asOf) / (1000 * 60 * 60 * 24));

        events.push({
          id: row.id,
          code: row.code,
          description: row.description,
          basic: row.basic,
          basicLabel: BASIC_LABEL[row.basic] || row.basic,
          date: row.date,
          driver: row.driver,
          unit: row.unit,
          oos: row.oos,
          severity: Number(row.severity),
          effectiveSeverity: eff,
          currentWeight: weightNow,
          currentPoints: Math.round(eff * weightNow * 10) / 10,
          transitionAt: t.at.toISOString().slice(0, 10),
          transitionLabel: t.label,
          pointsDrop: t.pointsDrop,
          daysUntil,
          monthKey: `${t.at.getFullYear()}-${String(t.at.getMonth() + 1).padStart(2, "0")}`,
          monthLabel: t.at.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        });
      }
    }

    events.sort((a, b) => a.daysUntil - b.daysUntil || a.code?.localeCompare(b.code || ""));

    // summary by month
    const byMonth = {};
    for (const e of events) {
      if (!byMonth[e.monthKey]) {
        byMonth[e.monthKey] = {
          monthKey: e.monthKey,
          monthLabel: e.monthLabel,
          pointsDrop: 0,
          count: 0,
        };
      }
      byMonth[e.monthKey].pointsDrop += e.pointsDrop;
      byMonth[e.monthKey].count += 1;
    }

    const summary = Object.values(byMonth)
      .map((m) => ({
        ...m,
        pointsDrop: Math.round(m.pointsDrop * 10) / 10,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const totalPoints = Math.round(events.reduce((s, e) => s + e.pointsDrop, 0) * 10) / 10;

    return NextResponse.json({
      asOf: asOf.toISOString().slice(0, 10),
      monthsAhead,
      totalEvents: events.length,
      totalPointsDrop: totalPoints,
      summary,
      events,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
