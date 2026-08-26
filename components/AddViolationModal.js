"use client";

import { useState } from "react";
import { BASICS } from "../lib/calc";

export default function AddViolationModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    code: "",
    description: "",
    basic: BASICS[0].id,
    severity: 5,
    oos: false,
    driver: "",
    unit: "",
    carrier: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, severity: Number(form.severity) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-lg border border-line w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[15px]">Add violation</h3>
          <button type="button" onClick={onClose} className="text-muted text-xl leading-none">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Violation date">
            <input type="date" required value={form.date} onChange={set("date")} max={new Date().toISOString().slice(0, 10)} className="input" />
          </Field>
          <Field label="Violation code">
            <input type="text" placeholder="e.g. 393.75(a)" value={form.code} onChange={set("code")} className="input" />
          </Field>
          <Field label="Description" full>
            <input type="text" placeholder="e.g. Tire tread depth" value={form.description} onChange={set("description")} className="input" />
          </Field>
          <Field label="BASIC category">
            <select value={form.basic} onChange={set("basic")} className="input">
              {BASICS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Severity weight (1-10)">
            <input type="number" min="1" max="10" required value={form.severity} onChange={set("severity")} className="input" />
          </Field>
          <Field label="Driver (optional)">
            <input type="text" value={form.driver} onChange={set("driver")} className="input" />
          </Field>
          <Field label="Unit (optional)">
            <input type="text" value={form.unit} onChange={set("unit")} className="input" />
          </Field>
          <label className="flex items-center gap-2 text-[13px] col-span-2 mt-1">
            <input type="checkbox" checked={form.oos} onChange={set("oos")} />
            Out-of-service order issued
          </label>
        </div>

        {error && <div className="text-red text-[12px] mt-3">{error}</div>}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-line text-[13px]">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-ink text-white text-[13px] font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Add to record"}
          </button>
        </div>

        <style jsx>{`
          .input {
            border: 1px solid #e7e9ec;
            border-radius: 6px;
            padding: 8px 10px;
            font-size: 13px;
            width: 100%;
          }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, full, children }) {
  return (
    <label className={"flex flex-col gap-1 text-[12px] text-muted " + (full ? "col-span-2" : "")}>
      {label}
      {children}
    </label>
  );
}
