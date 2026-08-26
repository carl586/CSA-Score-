import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
}

export const sql = neon(process.env.DATABASE_URL);
