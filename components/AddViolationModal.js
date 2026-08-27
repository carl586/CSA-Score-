"use client";

import { useEffect, useState } from "react";
import { BASICS } from "../lib/calc";

function normalizeCode(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()]/g, ""); // also ignore parens differences
}

// Map whatever is stored in violation_codes.basic → app id
function mapBasic(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();

  // exact app ids
  const byId = BASICS.find((b) => b.id === s);
  if (byId) return byId.id;

  // exact labels
  const byLabel = BASICS.find((b) => b.label.toLowerCase() === s);
  if (byLabel) return byLabel.id;

  // common aliases from FMCSA / exports
  const aliases = {
    "unsafe driving": "unsafe_driving",
    "unsafe_driving": "unsafe_driving",
    ud: "unsafe_driving",
    hos: "hos",
    "hours of service": "hos",
    "hours-of-service": "hos",
    "hours-of-service compliance": "hos",
    "hos compliance": "hos",
    "driver fitness": "driver_fitness",
    "driver_fitness": "driver_fitness",
    fitness: "driver_fitness",
    substance: "substance",
    "controlled substances": "substance",
    "controlled substances / alcohol": "substance",
    "controlled substances/alcohol": "substance",
    alcohol: "substance",
    "vehicle maintenance": "vehicle_maint",
    "vehicle_maint": "vehicle_maint",
    "vehicle maint": "vehicle_maint",
    maintenance: "vehicle_maint",
    vm: "vehicle_maint",
    hazmat: "hazmat",
    "hazardous materials": "hazmat",
    "hazardous materials compliance": "hazmat",
    hm: "hazmat",
    crash: "crash",
    "crash indicator": "crash",
  };

  for (const [k, v] of Object.entries(aliases)) {
    if (s === k || s.includes(k)) return v;
  }
  return null;
}

export default function AddViolationModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    code: "",
    description: "",
    basic: "",
    severity: "",
    oos: false,
    driver: "",
    unit: "",
    carrier: "",
  });
  const [codes, setCodes] = useState([]);
  const [status, setStatus] = useState(""); // matched | missing | ""
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/violation-codes")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setCodes(Array.isArray(rows) ? rows : []))
      .catch(() => setCodes([]));
  }, []);

  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const applyCode = (code) => {
    const norm = normalizeCode(code);
    if (!norm) {
      setStatus("");
      setForm((f) => ({ ...f, code }));
      return;
    }

    // exact normalized match first, then startsWith for partial paste
    let hit =
      codes.find((c) => normalizeCode(c.code) === norm) ||
      codes.find((c) => normalizeCode(c.code).startsWith(norm)) ||
      codes.find((c) => norm.startsWith(normalizeCode(c.code)));

    if (hit) {
      const basicId = mapBasic(hit.basic) || "";
      setForm((f) => ({
        ...f,
        code,
        description: hit.description || "",
        basic: basicId,
        severity: String(hit.severity_weight ?? ""),
      }));
      setStatus(basicId ? "matched" : "basic-unknown");
    } else {
      setForm((f) => ({
        ...f,
        code,
        // leave other fields alone so user can type freely if unknown
      }));
      setStatus("missing");
    }
  };

  const onCodeChange = (e) => applyCode(e.target.value);

  // also catch paste events reliably
  const onCodePaste = (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    // let the input update, then apply
    setTimeout(() => applyCode(text.trim()), 0);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!form.basic) throw new Error("BASIC category is required — pick one or use a known code");
      if (!form.severity) throw new Error("Severity weight is required");

      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          severity: Number(form.severity),
        }),
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
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-lg border border-line w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[15px]">Add violation</h3>
          <button type="button" onClick={onClose} className="text-muted text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Violation date">
            <input
              type="date"
              required
              value={form.date}
              onChange={set("date")}
              max={new Date().toISOString().slice(0, 10)}
              className="input"
            />
          </Field>

          <Field label="Violation code">
            <input
              type="text"
              placeholder="Paste code, e.g. 395.8(e)"
              value={form.code}
              onChange={onCodeChange}
              onPaste={onCodePaste}
              list="violation-code-list"
              className="input"
              autoComplete="off"
            />
            <datalist id="violation-code-list">
              {codes.slice(0, 500).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.description || c.code}
                </option>
              ))}
            </datalist>
            {status === "matched" && (
              <span className="text-[11px] text-green mt-0.5">
                Matched — description, BASIC & severity filled (you can still edit severity)
              </span>
            )}
            {status === "basic-unknown" && (
              <span className="text-[11px] text-amber mt-0.5">
                Code found, but BASIC value in library is unknown — pick BASIC manually
              </span>
            )}
            {status === "missing" && (
              <span className="text-[11px] text-muted mt-0.5">
                No match in code library — fill fields manually
              </span>
            )}
          </Field>

          <Field label="Description" full>
            <input
              type="text"
              value={form.description}
              onChange={set("description")}
              className="input"
              placeholder="Filled from code library when matched"
            />
          </Field>

          <Field label="BASIC category">
            <select value={form.basic} onChange={set("basic")} className="input" required>
              <option value="">— select —</option>
              {BASICS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Severity weight (1–10)">
            <input
              type="number"
              min="1"
              max="10"
              required
              value={form.severity}
              onChange={set("severity")}
              className="input"
            />
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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-line text-[13px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-ink text-white text-[13px] font-medium disabled:opacity-50"
          >
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
