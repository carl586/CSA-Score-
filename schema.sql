-- Run this once in the Neon SQL editor (or via psql) to create the table.

CREATE TABLE IF NOT EXISTS violations (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  code TEXT,
  description TEXT,
  basic TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 10),
  oos BOOLEAN NOT NULL DEFAULT FALSE,
  driver TEXT,
  unit TEXT,
  carrier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS violations_date_idx ON violations (date);
CREATE INDEX IF NOT EXISTS violations_basic_idx ON violations (basic);
