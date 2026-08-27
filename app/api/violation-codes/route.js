import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM violation_codes ORDER BY code ASC`;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { code, description, basic, violation_group, severity_weight } = body;

    if (!code || !basic || !severity_weight) {
      return NextResponse.json(
        { error: "code, basic, and severity_weight are required" },
        { status: 400 }
      );
    }

    const [row] = await sql`
      INSERT INTO violation_codes (code, description, basic, violation_group, severity_weight)
      VALUES (${code}, ${description || null}, ${basic}, ${violation_group || null}, ${severity_weight})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
