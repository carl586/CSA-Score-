import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { BASICS, addMonths, monthsBetween, timeWeight } from "../../../../lib/calc";

const MONTHS_BACK = 11; // + current month = 12 months of history
const MONTHS_FORWARD = 3; // months of projection ahead

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const basicFilter = searchParams.get("basic");

    const rows = await sql`SELECT id, date, basic, severity, oos FROM violations`;
    const asOf = new Date();

    // --- Top blocks: current active points per BASIC (always all 7) ---
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

    // --- Timeline: points added per month + points rolled off per month ---
    const relevantRows =
      basicFilter && basicFilter !== "all"
        ? rows.filter((r) => r.basic === basicFilter)
        : rows;

    const start = addMonths(new Date(asOf.getFullYear(), asOf.getMonth(), 1), -MONTHS_BACK);
    const months = [];
    for (let i = 0; i <= MONTHS_BACK + MONTHS_FORWARD; i++) months.push(addMonths(start, i));

    const added = Object.fromEntries(months.map((m) => [monthKey(m), 0]));
    const rolledOff = Object.fromEntries(months.map((m) => [monthKey(m), 0]));

    for (const row of relevantRows) {
      const effSeverity = Number(row.severity) + (row.oos ? 2 : 0);
      const vDate = new Date(row.date);

      // Added: the violation enters at x3, so its full x3 value lands in its own month
      const addedKey = monthKey(vDate);
      if (addedKey in added) added[addedKey] += effSeverity * 3;

      // Rolled off: each transition (6mo: x3->x2, 12mo: x2->x1, 24mo: x1->off)
      // drops the point value by exactly effSeverity, since each step is one weight level
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

    return NextResponse.json({ categories, timeline });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
