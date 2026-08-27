import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT code, description, basic, violation_group, severity_weight
      FROM violation_codes
      ORDER BY code ASC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const code = body.code;
    const description = body.description || null;
    const basic = body.basic;
    const violation_group = body.violation_group || null;
    const severity_weight = Number(body.severity_weight ?? body.severity);

    if (!code || !basic || !severity_weight) {
      return NextResponse.json(
        { error: "code, basic, and severity_weight are required" },
        { status: 400 }
      );
    }

    const [row] = await sql`
      INSERT INTO violation_codes (code, description, basic, violation_group, severity_weight)
      VALUES (${code}, ${description}, ${basic}, ${violation_group}, ${severity_weight})
      ON CONFLICT (code) DO UPDATE SET
        description = EXCLUDED.description,
        basic = EXCLUDED.basic,
        violation_group = EXCLUDED.violation_group,
        severity_weight = EXCLUDED.severity_weight
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
