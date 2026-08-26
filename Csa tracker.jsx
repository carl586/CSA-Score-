import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Plus, Upload, Trash2, ChevronDown, ChevronRight, AlertTriangle, Clock, X, Truck,
} from "lucide-react";
import Papa from "papaparse";

// ---------------------------------------------------------------------------
// Domain constants
// ---------------------------------------------------------------------------
const BASICS = [
  { id: "unsafe_driving", label: "Unsafe Driving", short: "UNSAFE DRV" },
  { id: "hos", label: "Hours-of-Service Compliance", short: "HOS" },
  { id: "driver_fitness", label: "Driver Fitness", short: "DRV FITNESS" },
  { id: "substance", label: "Controlled Substances / Alcohol", short: "SUBSTANCE" },
  { id: "vehicle_maint", label: "Vehicle Maintenance", short: "VEH MAINT" },
  { id: "hazmat", label: "Hazardous Materials Compliance", short: "HAZMAT" },
  { id: "crash", label: "Crash Indicator", short: "CRASH" },
];
const BASIC_BY_ID = Object.fromEntries(BASICS.map((b) => [b.id, b]));

const STORAGE_KEY = "csa-violations";

// ---------------------------------------------------------------------------
// Date / decay math
// ---------------------------------------------------------------------------
function addMonths(date, n) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}
function monthsBetween(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) +
    (to.getDate() - from.getDate()) / 30.44;
}
function timeWeight(monthsAgo) {
  if (monthsAgo < 0) return 0;
  if (monthsAgo <= 6) return 3;
  if (monthsAgo <= 12) return 2;
  if (monthsAgo <= 24) return 1;
  return 0;
}
function pointsAsOf(violation, asOf) {
  const vDate = new Date(violation.date);
  if (vDate > asOf) return 0;
  const m = monthsBetween(vDate, asOf);
  return violation.severity * timeWeight(m);
}
function zoneAsOf(violation, asOf) {
  const m = monthsBetween(new Date(violation.date), asOf);
  const w = timeWeight(m);
  if (w === 3) return "zone-3x";
  if (w === 2) return "zone-2x";
  if (w === 1) return "zone-1x";
  return "zone-off";
}
function nextTransition(violation, today) {
  const vDate = new Date(violation.date);
  const marks = [
    { at: addMonths(vDate, 6), label: "drops to 2x weight" },
    { at: addMonths(vDate, 12), label: "drops to 1x weight" },
    { at: addMonths(vDate, 24), label: "rolls off record" },
  ];
  const future = marks.filter((mk) => mk.at > today);
  return future.length ? future[0] : null;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function daysUntil(date, today) {
  return Math.ceil((new Date(date) - today) / (1000 * 60 * 60 * 24));
}
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// Seed data - lets the app demonstrate itself before the person uploads
// ---------------------------------------------------------------------------
function seedViolations() {
  const today = new Date();
  const back = (m) => addMonths(today, -m).toISOString().slice(0, 10);
  return [
    { id: uid(), date: back(1), code: "393.75(a)", description: "Tire tread depth", basic: "vehicle_maint", severity: 6, oos: true },
    { id: uid(), date: back(3), code: "395.8(e)", description: "Log form/manner incomplete", basic: "hos", severity: 3, oos: false },
    { id: uid(), date: back(4), code: "392.2", description: "Speeding 8 mph over", basic: "unsafe_driving", severity: 5, oos: false },
    { id: uid(), date: back(8), code: "393.9", description: "Inoperative lamp", basic: "vehicle_maint", severity: 4, oos: false },
    { id: uid(), date: back(10), code: "391.41", description: "Medical cert expired", basic: "driver_fitness", severity: 5, oos: true },
    { id: uid(), date: back(15), code: "392.2", description: "Following too close", basic: "unsafe_driving", severity: 7, oos: false },
    { id: uid(), date: back(20), code: "393.47", description: "Brake out of adjustment", basic: "vehicle_maint", severity: 8, oos: true },
    { id: uid(), date: back(23), code: "395.3", description: "11-hour driving limit", basic: "hos", severity: 7, oos: false },
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CSATracker() {
  const [violations, setViolations] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedBasic, setSelectedBasic] = useState("all");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const today = useMemo(() => new Date(), []);

  // load from persistent storage on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        const list = res ? JSON.parse(res.value) : null;
        setViolations(list && list.length ? list : seedViolations());
      } catch (e) {
        setViolations(seedViolations());
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (list) => {
    try {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify(list), false);
      setSaveError(!result);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  const updateViolations = useCallback((updater) => {
    setViolations((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }, [persist]);

  const addViolation = (v) => updateViolations((prev) => [...prev, { ...v, id: uid() }]);
  const removeViolation = (id) => updateViolations((prev) => prev.filter((v) => v.id !== id));

  // ---- derived data ----------------------------------------------------
  const active = violations.filter((v) => monthsBetween(new Date(v.date), today) <= 24 && new Date(v.date) <= today);

  const basicTotals = useMemo(() => {
    const map = {};
    BASICS.forEach((b) => { map[b.id] = { points: 0, count: 0, z3: 0, z2: 0, z1: 0 }; });
    active.forEach((v) => {
      const pts = pointsAsOf(v, today);
      const zone = zoneAsOf(v, today);
      if (!map[v.basic]) return;
      map[v.basic].points += pts;
      map[v.basic].count += 1;
      if (zone === "zone-3x") map[v.basic].z3 += pts;
      if (zone === "zone-2x") map[v.basic].z2 += pts;
      if (zone === "zone-1x") map[v.basic].z1 += pts;
    });
    return map;
  }, [active, today]);

  const totalPoints = Object.values(basicTotals).reduce((s, b) => s + b.points, 0);

  // 24-month trend, reconstructed from stored violation dates
  const trendData = useMemo(() => {
    const months = [];
    for (let i = 23; i >= 0; i--) {
      const asOf = addMonths(today, -i);
      asOf.setDate(28);
      const row = { label: asOf.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
      let sum = 0;
      BASICS.forEach((b) => {
        const pts = violations
          .filter((v) => v.basic === b.id)
          .reduce((s, v) => s + pointsAsOf(v, asOf), 0);
        row[b.id] = Math.round(pts * 10) / 10;
        sum += pts;
      });
      row.total = Math.round(sum * 10) / 10;
      months.push(row);
    }
    return months;
  }, [violations, today]);

  const upcoming = useMemo(() => {
    return active
      .map((v) => ({ v, nt: nextTransition(v, today) }))
      .filter((x) => x.nt && daysUntil(x.nt.at, today) <= 90)
      .sort((a, b) => a.nt.at - b.nt.at);
  }, [active, today]);

  const visibleViolations = useMemo(() => {
    const list = selectedBasic === "all" ? violations : violations.filter((v) => v.basic === selectedBasic);
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [violations, selectedBasic]);

  if (!loaded) {
    return (
      <div className="csa-root csa-loading">
        <style>{CSS}</style>
        <div className="loading-pulse">LOADING RECORD…</div>
      </div>
    );
  }

  return (
    <div className="csa-root">
      <style>{CSS}</style>

      <header className="csa-header">
        <div className="brand">
          <Truck size={22} strokeWidth={2} />
          <div>
            <div className="brand-title">ROLL-OFF</div>
            <div className="brand-sub">CSA point &amp; decay tracker</div>
          </div>
        </div>
        <div className="header-readout">
          <span className="readout-label">AS OF</span>
          <span className="readout-value">{fmtDate(today)}</span>
        </div>
      </header>

      <div className="disclaimer">
        Tracks raw time-weighted severity points per BASIC from the violations you enter. This is not
        FMCSA's official percentile — percentiles compare your points against a peer group FMCSA computes centrally.
      </div>

      {saveError && (
        <div className="save-error">
          <AlertTriangle size={14} /> Couldn't save to storage — changes may not persist this session.
        </div>
      )}

      {/* ---------------- BASIC summary cards ---------------- */}
      <section className="basic-grid">
        {BASICS.map((b) => {
          const t = basicTotals[b.id];
          const max = Math.max(1, ...BASICS.map((x) => basicTotals[x.id].points));
          const pct = Math.round((t.points / max) * 100);
          return (
            <button
              key={b.id}
              className={"basic-card" + (selectedBasic === b.id ? " basic-card--active" : "")}
              onClick={() => setSelectedBasic(selectedBasic === b.id ? "all" : b.id)}
            >
              <div className="basic-card-top">
                <span className="basic-short">{b.short}</span>
                <span className="basic-count">{t.count} viol.</span>
              </div>
              <div className="basic-points">{Math.round(t.points * 10) / 10}</div>
              <div className="basic-bar-track">
                <div className="basic-bar-fill" style={{ width: pct + "%" }} />
              </div>
              <div className="basic-zone-legend">
                <span><i className="dot dot-3x" />{Math.round(t.z3 * 10) / 10}</span>
                <span><i className="dot dot-2x" />{Math.round(t.z2 * 10) / 10}</span>
                <span><i className="dot dot-1x" />{Math.round(t.z1 * 10) / 10}</span>
              </div>
            </button>
          );
        })}
      </section>

      {/* ---------------- Trend chart ---------------- */}
      <section className="panel">
        <div className="panel-header">
          <h2>24-MONTH POINT TREND</h2>
          <select
            className="basic-select"
            value={selectedBasic}
            onChange={(e) => setSelectedBasic(e.target.value)}
          >
            <option value="all">All BASICs (total)</option>
            {BASICS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F2A93B" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#F2A93B" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2A343E" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="label" stroke="#6B7885" fontSize={11} tickLine={false} axisLine={{ stroke: "#2A343E" }} interval={2} />
              <YAxis stroke="#6B7885" fontSize={11} tickLine={false} axisLine={false} width={34} />
              <Tooltip
                contentStyle={{ background: "#1A2027", border: "1px solid #313D49", borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: "#EDF1F4", fontFamily: "IBM Plex Mono, monospace" }}
                itemStyle={{ color: "#F2A93B" }}
              />
              <Area
                type="monotone"
                dataKey={selectedBasic === "all" ? "total" : selectedBasic}
                stroke="#F2A93B"
                strokeWidth={2}
                fill="url(#fillAmber)"
                name={selectedBasic === "all" ? "Total weighted points" : BASIC_BY_ID[selectedBasic].label}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="two-col">
        {/* ---------------- Roll-off forecast ---------------- */}
        <section className="panel">
          <div className="panel-header">
            <h2>NEXT 90 DAYS</h2>
            <span className="panel-hint">{upcoming.length} transition{upcoming.length === 1 ? "" : "s"}</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state">Nothing re-weights or rolls off in the next 90 days.</div>
          ) : (
            <ul className="forecast-list">
              {upcoming.map(({ v, nt }) => (
                <li key={v.id} className="forecast-row">
                  <div className="forecast-days">
                    <Clock size={12} />{daysUntil(nt.at, today)}d
                  </div>
                  <div className="forecast-body">
                    <div className="forecast-code">{v.code} <span className="forecast-basic">{BASIC_BY_ID[v.basic]?.short}</span></div>
                    <div className="forecast-desc">{nt.label} · {fmtDate(nt.at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------- Actions ---------------- */}
        <section className="panel actions-panel">
          <div className="panel-header"><h2>RECORD A VIOLATION</h2></div>
          <p className="actions-copy">
            Add violations one at a time from a fresh inspection, or bulk-import a month's worth (or your full 2-year history) from a spreadsheet.
          </p>
          <div className="actions-row">
            <button className="btn btn-primary" onClick={() => { setShowForm(true); setShowImport(false); }}>
              <Plus size={15} /> Add violation
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowImport(true); setShowForm(false); }}>
              <Upload size={15} /> Bulk import
            </button>
          </div>
        </section>
      </div>

      {showForm && <AddForm onClose={() => setShowForm(false)} onAdd={(v) => { addViolation(v); setShowForm(false); }} />}
      {showImport && (
        <ImportPanel
          text={importText}
          setText={setImportText}
          error={importError}
          setError={setImportError}
          onClose={() => setShowImport(false)}
          onImport={(rows) => { updateViolations((prev) => [...prev, ...rows]); setShowImport(false); setImportText(""); }}
        />
      )}

      {/* ---------------- Violations table ---------------- */}
      <section className="panel">
        <div className="panel-header">
          <h2>VIOLATION RECORD</h2>
          <span className="panel-hint">{visibleViolations.length} shown</span>
        </div>
        {visibleViolations.length === 0 ? (
          <div className="empty-state">No violations recorded yet. Add one or bulk-import to get started.</div>
        ) : (
          <div className="viol-table">
            {visibleViolations.map((v) => {
              const pts = pointsAsOf(v, today);
              const zone = zoneAsOf(v, today);
              const m = monthsBetween(new Date(v.date), today);
              const isExpanded = expandedId === v.id;
              return (
                <div key={v.id} className={"viol-row" + (zone === "zone-off" ? " viol-row--off" : "")}>
                  <div className="viol-row-main" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                    <button className="expand-btn">{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                    <div className="viol-date">{fmtDate(v.date)}</div>
                    <div className="viol-code">{v.code || "—"}</div>
                    <div className="viol-desc">{v.description || "—"}</div>
                    <div className="viol-basic-tag">{BASIC_BY_ID[v.basic]?.short || "?"}</div>
                    {v.oos && <span className="oos-badge">OOS</span>}
                    <div className={"viol-zone-badge " + zone}>
                      {zone === "zone-3x" && "×3"}
                      {zone === "zone-2x" && "×2"}
                      {zone === "zone-1x" && "×1"}
                      {zone === "zone-off" && "rolled off"}
                    </div>
                    <div className="viol-points">{Math.round(pts * 10) / 10} pts</div>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); removeViolation(v.id); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {isExpanded && <DecayTrack violation={v} monthsAgo={m} today={today} />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="csa-footer">
        Severity weight (1–10) and BASIC come from your inspection report. Time weight: ×3 for 0–6 months,
        ×2 for 7–12 months, ×1 for 13–24 months, then the violation rolls off. Stored privately in this browser session's data store — only you can see it.
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decay track — signature visual: shows where a violation sits in its 24-month life
// ---------------------------------------------------------------------------
function DecayTrack({ violation, monthsAgo, today }) {
  const clamped = Math.max(0, Math.min(24, monthsAgo));
  const markerPct = (clamped / 24) * 100;
  const nt = nextTransition(violation, today);
  return (
    <div className="decay-track-wrap">
      <div className="decay-track">
        <div className="decay-zone decay-zone-3" style={{ left: "0%", width: "25%" }}>
          <span>0–6mo · ×3</span>
        </div>
        <div className="decay-zone decay-zone-2" style={{ left: "25%", width: "25%" }}>
          <span>7–12mo · ×2</span>
        </div>
        <div className="decay-zone decay-zone-1" style={{ left: "50%", width: "50%" }}>
          <span>13–24mo · ×1</span>
        </div>
        {monthsAgo <= 24 && (
          <div className="decay-marker" style={{ left: markerPct + "%" }} title={`${Math.round(monthsAgo * 10) / 10} months ago`} />
        )}
      </div>
      <div className="decay-meta">
        <span>Recorded {fmtDate(violation.date)} · {Math.round(monthsAgo * 10) / 10} months ago</span>
        {nt ? <span>Next: {nt.label} on {fmtDate(nt.at)} ({daysUntil(nt.at, today)}d)</span> : <span>Fully rolled off record</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-violation form
// ---------------------------------------------------------------------------
function AddForm({ onClose, onAdd }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [basic, setBasic] = useState(BASICS[0].id);
  const [severity, setSeverity] = useState(5);
  const [oos, setOos] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    onAdd({ date, code: code.trim(), description: description.trim(), basic, severity: Number(severity), oos });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-panel" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h3>Add violation</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Violation date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required max={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="field">
            <span>Violation code</span>
            <input type="text" placeholder="e.g. 393.75(a)" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <label className="field field-wide">
            <span>Description</span>
            <input type="text" placeholder="e.g. Tire tread depth" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="field">
            <span>BASIC category</span>
            <select value={basic} onChange={(e) => setBasic(e.target.value)}>
              {BASICS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Severity weight (1–10)</span>
            <input type="number" min="1" max="10" value={severity} onChange={(e) => setSeverity(e.target.value)} required />
          </label>
          <label className="field field-checkbox">
            <input type="checkbox" checked={oos} onChange={(e) => setOos(e.target.checked)} />
            <span>Out-of-service order issued</span>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary"><Plus size={15} /> Add to record</button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk import panel (CSV paste)
// ---------------------------------------------------------------------------
function ImportPanel({ text, setText, error, setError, onClose, onImport }) {
  const parse = () => {
    setError("");
    if (!text.trim()) { setError("Paste some rows first."); return; }
    Papa.parse(text.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
    const res = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
    if (res.errors && res.errors.length) { setError("Couldn't parse that as CSV: " + res.errors[0].message); return; }
    const basicIds = new Set(BASICS.map((b) => b.id));
    const basicByLabel = Object.fromEntries(BASICS.map((b) => [b.label.toLowerCase(), b.id]));
    const rows = [];
    for (const r of res.data) {
      const rawDate = r.date || r.violation_date || r["violation date"];
      const rawBasic = (r.basic || r.basic_id || r.category || "").toString().trim().toLowerCase();
      const basicId = basicIds.has(rawBasic) ? rawBasic : (basicByLabel[rawBasic] || null);
      const severity = Number(r.severity || r.severity_weight || r["severity weight"] || 0);
      if (!rawDate || !basicId || !severity) continue;
      const parsedDate = new Date(rawDate);
      if (isNaN(parsedDate.getTime())) continue;
      rows.push({
        id: uid(),
        date: parsedDate.toISOString().slice(0, 10),
        code: (r.code || r.violation_code || "").toString().trim(),
        description: (r.description || "").toString().trim(),
        basic: basicId,
        severity: Math.max(1, Math.min(10, severity)),
        oos: /^(y|yes|true|1)$/i.test((r.oos || r.out_of_service || "").toString().trim()),
      });
    }
    if (!rows.length) { setError("No valid rows found. Check the column names against the template below."); return; }
    onImport(rows);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Bulk import</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="import-copy">
          Paste CSV rows below — copy straight from a spreadsheet. Required columns: <code>date</code>, <code>basic</code>
          (a BASIC name), <code>severity</code> (1–10). Optional: <code>code</code>, <code>description</code>, <code>oos</code> (yes/no).
        </p>
        <textarea
          className="import-textarea"
          placeholder={"date,code,description,basic,severity,oos\n2026-05-14,393.75(a),Tire tread depth,Vehicle Maintenance,6,yes"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
        />
        {error && <div className="import-error"><AlertTriangle size={13} /> {error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={parse}><Upload size={15} /> Import rows</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.csa-root {
  --bg: #12161A;
  --bg-alt: #171D22;
  --surface: #1B2229;
  --surface-alt: #212A32;
  --border: #2A343E;
  --amber: #F2A93B;
  --amber-dim: #8A6423;
  --red: #E15252;
  --green: #5FB489;
  --text: #EDF1F4;
  --text-muted: #8D9AA6;
  --text-faint: #5C6772;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  padding: 20px;
  border-radius: 10px;
  max-width: 100%;
  box-sizing: border-box;
}
.csa-root * { box-sizing: border-box; }
.csa-loading { display:flex; align-items:center; justify-content:center; min-height: 240px; }
.loading-pulse { font-family:'IBM Plex Mono',monospace; color: var(--text-muted); letter-spacing: 0.1em; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }

.csa-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 14px; }
.brand { display:flex; align-items:center; gap:10px; color: var(--amber); }
.brand-title { font-family:'Oswald',sans-serif; font-weight:700; font-size: 20px; letter-spacing: 0.06em; color: var(--text); line-height:1; }
.brand-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 0.03em; margin-top:2px; }
.header-readout { text-align:right; font-family:'IBM Plex Mono',monospace; }
.readout-label { display:block; font-size:10px; color: var(--text-faint); letter-spacing:0.12em; }
.readout-value { font-size: 13px; color: var(--amber); }

.disclaimer { font-size: 11.5px; color: var(--text-muted); background: var(--bg-alt); border: 1px solid var(--border); border-left: 3px solid var(--amber-dim); padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; line-height:1.5; }
.save-error { display:flex; align-items:center; gap:6px; font-size:12px; color: var(--red); margin-bottom: 12px; }

.basic-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 10px; margin-bottom: 18px; }
.basic-card { text-align:left; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; cursor: pointer; transition: border-color .15s, transform .1s; font-family: inherit; color: inherit; }
.basic-card:hover { border-color: var(--amber-dim); }
.basic-card--active { border-color: var(--amber); background: var(--surface-alt); }
.basic-card-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px; }
.basic-short { font-family:'Oswald',sans-serif; font-size: 11.5px; letter-spacing: 0.05em; color: var(--text-muted); }
.basic-count { font-size: 10px; color: var(--text-faint); font-family:'IBM Plex Mono',monospace; }
.basic-points { font-family:'IBM Plex Mono',monospace; font-size: 24px; font-weight: 600; color: var(--amber); line-height:1; margin-bottom: 8px; }
.basic-bar-track { height: 4px; background: var(--bg-alt); border-radius: 2px; overflow:hidden; margin-bottom: 8px; }
.basic-bar-fill { height:100%; background: linear-gradient(90deg, var(--amber-dim), var(--amber)); border-radius:2px; }
.basic-zone-legend { display:flex; gap:8px; font-size: 10px; color: var(--text-faint); font-family:'IBM Plex Mono',monospace; }
.basic-zone-legend .dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:3px; }
.dot-3x { background: var(--amber); } .dot-2x { background: var(--amber-dim); } .dot-1x { background: var(--text-faint); }

.panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; }
.panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
.panel-header h2 { font-family:'Oswald',sans-serif; font-size: 12.5px; letter-spacing: 0.08em; color: var(--text-muted); margin:0; font-weight:600; }
.panel-hint { font-size: 11px; color: var(--text-faint); font-family:'IBM Plex Mono',monospace; }
.basic-select { background: var(--bg-alt); border: 1px solid var(--border); color: var(--text); font-size: 11.5px; padding: 5px 8px; border-radius: 5px; font-family:'Inter',sans-serif; }
.chart-wrap { margin: 0 -6px; }

.two-col { display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 720px) { .two-col { grid-template-columns: 1fr; } }

.empty-state { color: var(--text-faint); font-size: 12.5px; padding: 18px 4px; text-align:center; }
.forecast-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; max-height: 220px; overflow-y:auto; }
.forecast-row { display:flex; gap:10px; align-items:flex-start; padding: 7px 8px; background: var(--bg-alt); border-radius: 6px; border: 1px solid var(--border); }
.forecast-days { display:flex; align-items:center; gap:4px; font-family:'IBM Plex Mono',monospace; font-size: 11px; color: var(--amber); min-width: 44px; }
.forecast-code { font-size: 12.5px; font-weight:500; }
.forecast-basic { font-size:10px; color: var(--text-faint); margin-left:6px; }
.forecast-desc { font-size: 11px; color: var(--text-muted); margin-top:1px; }

.actions-panel { display:flex; flex-direction:column; }
.actions-copy { font-size: 12px; color: var(--text-muted); line-height:1.5; margin: 0 0 12px; }
.actions-row { display:flex; gap:8px; margin-top:auto; }

.btn { display:inline-flex; align-items:center; gap:6px; font-family:'Inter',sans-serif; font-size: 12.5px; font-weight:600; padding: 9px 14px; border-radius: 6px; border: 1px solid transparent; cursor:pointer; transition: opacity .12s; }
.btn:hover { opacity:.88; }
.btn-primary { background: var(--amber); color: #1A1305; }
.btn-ghost { background: transparent; border-color: var(--border); color: var(--text); }

.viol-table { display:flex; flex-direction:column; gap:6px; }
.viol-row { border: 1px solid var(--border); border-radius: 7px; background: var(--bg-alt); overflow:hidden; }
.viol-row--off { opacity: 0.55; }
.viol-row-main { display:flex; align-items:center; gap:10px; padding: 9px 10px; cursor:pointer; flex-wrap: wrap; }
.expand-btn { background:none; border:none; color: var(--text-faint); cursor:pointer; display:flex; padding:0; }
.viol-date { font-family:'IBM Plex Mono',monospace; font-size:11.5px; color: var(--text-muted); min-width: 78px; }
.viol-code { font-family:'IBM Plex Mono',monospace; font-size:11.5px; color: var(--amber); min-width: 70px; }
.viol-desc { font-size: 12.5px; flex: 1; min-width: 120px; color: var(--text); }
.viol-basic-tag { font-size: 10px; letter-spacing:0.04em; color: var(--text-muted); background: var(--surface-alt); padding: 3px 7px; border-radius: 4px; }
.oos-badge { font-size: 9.5px; font-weight:700; letter-spacing:0.05em; color: #1A1305; background: var(--red); padding: 2px 6px; border-radius: 4px; }
.viol-zone-badge { font-family:'IBM Plex Mono',monospace; font-size: 10.5px; padding: 3px 7px; border-radius: 4px; }
.zone-3x { background: rgba(242,169,59,0.22); color: var(--amber); }
.zone-2x { background: rgba(242,169,59,0.13); color: var(--amber); }
.zone-1x { background: rgba(140,150,160,0.15); color: var(--text-muted); }
.zone-off { background: rgba(95,180,137,0.15); color: var(--green); }
.viol-points { font-family:'IBM Plex Mono',monospace; font-size: 12.5px; color: var(--text); min-width: 56px; text-align:right; }
.delete-btn { background:none; border:none; color: var(--text-faint); cursor:pointer; padding: 4px; display:flex; }
.delete-btn:hover { color: var(--red); }

.decay-track-wrap { padding: 4px 14px 14px 34px; }
.decay-track { position:relative; height: 26px; background: var(--surface-alt); border-radius: 5px; overflow:hidden; border: 1px solid var(--border); }
.decay-zone { position:absolute; top:0; bottom:0; display:flex; align-items:center; justify-content:center; font-size: 9px; color: var(--text-faint); font-family:'IBM Plex Mono',monospace; border-right: 1px solid var(--border); }
.decay-zone-3 { background: rgba(242,169,59,0.28); }
.decay-zone-2 { background: rgba(242,169,59,0.15); }
.decay-zone-1 { background: rgba(140,150,160,0.10); border-right:none; }
.decay-marker { position:absolute; top:-3px; bottom:-3px; width: 2px; background: var(--red); box-shadow: 0 0 6px rgba(225,82,82,0.7); }
.decay-meta { display:flex; justify-content:space-between; font-size: 10.5px; color: var(--text-faint); margin-top: 6px; font-family:'IBM Plex Mono',monospace; flex-wrap: wrap; gap:4px; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(8,10,12,0.6); display:flex; align-items:center; justify-content:center; z-index: 50; padding: 16px; }
.modal-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; width: 100%; max-width: 440px; }
.modal-panel-wide { max-width: 560px; }
.modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px; }
.modal-header h3 { font-family:'Oswald',sans-serif; font-size: 15px; letter-spacing:0.03em; margin:0; }
.icon-btn { background:none; border:none; color: var(--text-muted); cursor:pointer; }
.form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field { display:flex; flex-direction:column; gap:5px; font-size: 11.5px; color: var(--text-muted); }
.field-wide { grid-column: 1 / -1; }
.field input[type="text"], .field input[type="number"], .field input[type="date"], .field select {
  background: var(--bg-alt); border: 1px solid var(--border); color: var(--text); padding: 8px 9px; border-radius: 6px; font-size: 12.5px; font-family:'Inter',sans-serif;
}
.field-checkbox { flex-direction:row; align-items:center; gap:8px; grid-column: 1 / -1; }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 16px; }
.import-copy { font-size: 12px; color: var(--text-muted); line-height:1.5; margin: 0 0 10px; }
.import-copy code { background: var(--bg-alt); padding: 1px 5px; border-radius: 4px; color: var(--amber); font-family:'IBM Plex Mono',monospace; font-size:11px; }
.import-textarea { width:100%; background: var(--bg-alt); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 10px; font-family:'IBM Plex Mono',monospace; font-size: 11.5px; resize: vertical; }
.import-error { display:flex; align-items:center; gap:6px; font-size:12px; color: var(--red); margin-top:8px; }

.csa-footer { font-size: 10.5px; color: var(--text-faint); text-align:center; line-height:1.6; margin-top: 6px; padding-top: 10px; border-top: 1px solid var(--border); }
`;
