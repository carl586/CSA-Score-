import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { withDerived } from "../../../lib/calc";

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM violations ORDER BY date DESC`;
    return NextResponse.json(rows.map((r) => withDerived(r)));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { date, code, description, basic, severity, oos, driver, unit, carrier } = body;

    if (!date || !basic || !severity) {
      return NextResponse.json(
        { error: "date, basic, and severity are required" },
        { status: 400 }
      );
    }

    const [row] = await sql`
      INSERT INTO violations (date, code, description, basic, severity, oos, driver, unit, carrier)
      VALUES (${date}, ${code || null}, ${description || null}, ${basic}, ${severity},
              ${!!oos}, ${driver || null}, ${unit || null}, ${carrier || null})
      RETURNING *
    `;
    return NextResponse.json(withDerived(row), { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
