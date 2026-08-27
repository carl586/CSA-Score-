"use client";

import { useState } from "react";
import { BASICS } from "../lib/calc";

export default function AddViolationCodeModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    code: "",
    description: "",
    basic: BASICS[0].id,
    violation_group: "",
    severity_weight: 5,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/violation-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, severity_weight: Number(form.severity_weight) }),
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
          <h3 className="font-semibold text-[15px]">Add violation code</h3>
          <button type="button" onClick={onClose} className="text-muted text-xl leading-none">&times;</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Code">
            <input type="text" required placeholder="e.g. 393.75(a)" value={form.code} onChange={set("code")} className="input" />
          </Field>
          <Field label="Severity weight (1-10)">
            <input type="number" min="1" max="10" required value={form.severity_weight} onChange={set("severity_weight")} className="input" />
          </Field>
          <Field label="Description" full>
            <input type="text" value={form.description} onChange={set("description")} className="input" />
          </Field>
          <Field label="BASIC category">
            <select value={form.basic} onChange={set("basic")} className="input">
              {BASICS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Violation group">
            <input type="text" value={form.violation_group} onChange={set("violation_group")} className="input" />
          </Field>
        </div>

        {error && <div className="text-red text-[12px] mt-3">{error}</div>}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-line text-[13px]">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-ink text-white text-[13px] font-medium disabled:opacity-50">
            {saving ? "Saving..." : "Add code"}
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
