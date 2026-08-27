import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { BASICS, addMonths, monthsBetween, timeWeight } from "../../../../lib/calc";

// Exactly 24 months ending at the current month (23 back + current)
const MONTHS_BACK = 23;
// Show a few months of future weight drops on the chart
const MONTHS_FORWARD = 3;

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const basicFilter = searchParams.get("basic");

    const rows = await sql`SELECT id, date, basic, severity, oos FROM violations`;
    const asOf = new Date();
    const thisMonth = startOfMonth(asOf);
    const nextMonth = addMonths(thisMonth, 1);

    // --- Top blocks: current active points per BASIC ---
    const categoryTotals = Object.fromEntries(BASICS.map((b) => [b.id, 0]));
    for (const row of rows) {
      const effSeverity = Number(row.severity) + (row.oos ? 2 : 0);
      const weight = timeWeight(monthsBetween(new Date(row.date), asOf));
      if (weight > 0 && categoryTotals[row.basic] !== undefined) {
        categoryTotals[row.basic] += effSeverity * weight;
      }
    }
    const categories = BASICS.map((b) => ({
      id: b.id,
      label: b.label,
      points: Math.round(categoryTotals[b.id] * 10) / 10,
    }));

    // --- Upcoming point drops (next month) ---
    // x3→x2 and x2→x1 each drop by 1× severity; x1→off drops by 1× severity
    let nextMonthDrop = 0;
    let nextMonthCount = 0;
    const dropByType = { to2x: 0, to1x: 0, off: 0 };

    for (const row of rows) {
      if (basicFilter && basicFilter !== "all" && row.basic !== basicFilter) continue;
      const vDate = new Date(row.date);
      const effSeverity = Number(row.severity) + (row.oos ? 2 : 0);

      const t6 = startOfMonth(addMonths(vDate, 6));
      const t12 = startOfMonth(addMonths(vDate, 12));
      const t24 = startOfMonth(addMonths(vDate, 24));

      if (t6.getTime() === nextMonth.getTime()) {
        nextMonthDrop += effSeverity;
        nextMonthCount += 1;
        dropByType.to2x += effSeverity;
      }
      if (t12.getTime() === nextMonth.getTime()) {
        nextMonthDrop += effSeverity;
        nextMonthCount += 1;
        dropByType.to1x += effSeverity;
      }
      if (t24.getTime() === nextMonth.getTime()) {
        nextMonthDrop += effSeverity;
        nextMonthCount += 1;
        dropByType.off += effSeverity;
      }
    }

    const upcoming = {
      nextMonthLabel: nextMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      pointsDropping: Math.round(nextMonthDrop * 10) / 10,
      violationCount: nextMonthCount,
      to2x: Math.round(dropByType.to2x * 10) / 10,
      to1x: Math.round(dropByType.to1x * 10) / 10,
      off: Math.round(dropByType.off * 10) / 10,
    };

    // --- Timeline: 24 months history + a few months forward ---
    const relevantRows =
      basicFilter && basicFilter !== "all"
        ? rows.filter((r) => r.basic === basicFilter)
        : rows;

    const start = addMonths(thisMonth, -MONTHS_BACK);
    const months = [];
    for (let i = 0; i <= MONTHS_BACK + MONTHS_FORWARD; i++) {
      months.push(addMonths(start, i));
    }

    const added = Object.fromEntries(months.map((m) => [monthKey(m), 0]));
    const rolledOff = Object.fromEntries(months.map((m) => [monthKey(m), 0]));

    for (const row of relevantRows) {
      const effSeverity = Number(row.severity) + (row.oos ? 2 : 0);
      const vDate = new Date(row.date);

      const addedKey = monthKey(vDate);
      if (addedKey in added) added[addedKey] += effSeverity * 3;

      // Each weight step drops exactly 1× severity
      [6, 12, 24].forEach((n) => {
        const key = monthKey(addMonths(vDate, n));
        if (key in rolledOff) rolledOff[key] += effSeverity;
      });
    }

    const timeline = months.map((m) => {
      const key = monthKey(m);
      return {
        month: key,
        label: m.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        added: Math.round(added[key] * 10) / 10,
        rolledOff: Math.round(rolledOff[key] * 10) / 10,
      };
    });

    return NextResponse.json({ categories, timeline, upcoming });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
