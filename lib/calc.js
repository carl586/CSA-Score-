// FMCSA CSA time-weighting: 0-6 months = x3, 7-12 months = x2, 13-24 months = x1,
// then the violation rolls off SMS entirely. Severity weight (1-10) comes from the
// inspection report / violation code and is entered by the user. An OOS (out-of-
// service) order adds 2 to the severity before time-weighting is applied.

export const BASICS = [
  { id: "unsafe_driving", label: "Unsafe Driving" },
  { id: "hos", label: "Hours-of-Service Compliance" },
  { id: "driver_fitness", label: "Driver Fitness" },
  { id: "substance", label: "Controlled Substances / Alcohol" },
  { id: "vehicle_maint", label: "Vehicle Maintenance" },
  { id: "hazmat", label: "Hazardous Materials Compliance" },
  { id: "crash", label: "Crash Indicator" },
];

export const BASIC_LABEL = Object.fromEntries(BASICS.map((b) => [b.id, b.label]));

function addMonths(date, n) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + n);
  return d;
}

function monthsBetween(from, to) {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    (to.getDate() - from.getDate()) / 30.44
  );
}

function timeWeight(monthsAgo) {
  if (monthsAgo < 0) return 0;
  if (monthsAgo <= 6) return 3;
  if (monthsAgo <= 12) return 2;
  if (monthsAgo <= 24) return 1;
  return 0;
}

// Attaches computed fields (points, zone, next transition) to a raw DB row.
export function withDerived(row, asOf = new Date()) {
  const vDate = new Date(row.date);
  const m = monthsBetween(vDate, asOf);
  const weight = timeWeight(m);

  // OOS adds 2 to the severity before time-weighting, e.g. severity 10 + OOS
  // becomes effective 12, so it's 36/24/12 at x3/x2/x1 instead of 30/20/10.
  const effectiveSeverity = Number(row.severity) + (row.oos ? 2 : 0);
  const points = effectiveSeverity * weight;

  let zone = "off";
  if (weight === 3) zone = "3x";
  else if (weight === 2) zone = "2x";
  else if (weight === 1) zone = "1x";

  const marks = [
    { at: addMonths(vDate, 6), label: "re-weights to \u00d72" },
    { at: addMonths(vDate, 12), label: "re-weights to \u00d71" },
    { at: addMonths(vDate, 24), label: "rolls off record" },
  ];
  const next = marks.find((mk) => mk.at > asOf) || null;
  const nextDays = next ? Math.ceil((next.at - asOf) / (1000 * 60 * 60 * 24)) : null;

  return {
    ...row,
    monthsAgo: Math.round(m * 10) / 10,
    weight,
    effectiveSeverity,
    points: Math.round(points * 10) / 10,
    zone,
    nextLabel: next ? next.label : null,
    nextDays,
  };
}
