import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

export async function DELETE(_req, { params }) {
  try {
    await sql`DELETE FROM violations WHERE id = ${params.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
