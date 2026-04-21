/**
 * Circuit-based warehouse naming system.
 *
 * Each aisle face in the warehouse gets a unique dog-breed circuit name.
 * Location format: "CircuitName Rack#-Level"
 *   e.g. "Husky 3-C" = Circuit Husky, rack section 3, level C
 *
 * Rack# counts from 1 (front / loading docks) to 9–10 (back wall).
 * Level goes from A (ground) to E (top, ~5th pallet height).
 */

// ─── Circuit definition ──────────────────────────────────────────────────────

export interface Circuit {
  id: string;          // lowercase slug, e.g. "husky"
  name: string;        // display name, e.g. "Husky"
  oldAisle: string;    // original Excel letter: "G"
  zone: 1 | 2;        // Zone 1 (left of wall) or Zone 2 (right)
  rackCount: number;   // 9 or 10
  pairedWith: string | null; // id of the circuit sharing the physical rack structure
  /** position within aerial grid — lower = left on screen */
  order: number;
  /** emoji for fun in UI (optional) */
  icon: string;
}

export const LEVELS = ["A", "B", "C", "D", "E"] as const;
export type Level = (typeof LEVELS)[number];

/** Positions within a rack level (2 pallets side by side) */
export const POSITIONS = [1, 2] as const;
export type Position = (typeof POSITIONS)[number];

// ─── All 28 circuits ─────────────────────────────────────────────────────────

export const CIRCUITS: Circuit[] = [
  // ── Zone 1 (left of separator wall) ─────────────────────────────────────
  { id: "dalmata",   name: "Dálmata",   oldAisle: "A",  zone: 1, rackCount: 10, pairedWith: null,        order: 1,  icon: "🐾" },
  { id: "poodle",    name: "Poodle",    oldAisle: "B",  zone: 1, rackCount: 9,  pairedWith: "bulldog",   order: 2,  icon: "🐩" },
  { id: "bulldog",   name: "Bulldog",   oldAisle: "C",  zone: 1, rackCount: 9,  pairedWith: "poodle",    order: 3,  icon: "🐕" },
  { id: "beagle",    name: "Beagle",    oldAisle: "D",  zone: 1, rackCount: 9,  pairedWith: "labrador",  order: 4,  icon: "🦮" },
  { id: "labrador",  name: "Labrador",  oldAisle: "E",  zone: 1, rackCount: 9,  pairedWith: "beagle",    order: 5,  icon: "🐕‍🦺" },
  { id: "golden",    name: "Golden",    oldAisle: "F",  zone: 1, rackCount: 9,  pairedWith: "husky",     order: 6,  icon: "🐶" },
  { id: "husky",     name: "Husky",     oldAisle: "G",  zone: 1, rackCount: 9,  pairedWith: "golden",    order: 7,  icon: "🐺" },
  { id: "collie",    name: "Collie",    oldAisle: "H",  zone: 1, rackCount: 9,  pairedWith: "pastor",    order: 8,  icon: "🐕" },
  { id: "pastor",    name: "Pastor",    oldAisle: "I",  zone: 1, rackCount: 9,  pairedWith: "collie",    order: 9,  icon: "🐾" },
  { id: "boxer",     name: "Bóxer",     oldAisle: "J",  zone: 1, rackCount: 9,  pairedWith: "terrier",   order: 10, icon: "🐶" },
  { id: "terrier",   name: "Terrier",   oldAisle: "K",  zone: 1, rackCount: 9,  pairedWith: "boxer",     order: 11, icon: "🐕" },
  { id: "shitzu",    name: "Shitzu",    oldAisle: "L",  zone: 1, rackCount: 9,  pairedWith: "pug",       order: 12, icon: "🐩" },
  { id: "pug",       name: "Pug",       oldAisle: "M",  zone: 1, rackCount: 9,  pairedWith: "shitzu",    order: 13, icon: "🐶" },
  { id: "akita",     name: "Akita",     oldAisle: "N",  zone: 1, rackCount: 9,  pairedWith: "galgo",     order: 14, icon: "🐕" },
  { id: "galgo",     name: "Galgo",     oldAisle: "O",  zone: 1, rackCount: 9,  pairedWith: "akita",     order: 15, icon: "🐾" },
  { id: "doberman",  name: "Doberman",  oldAisle: "P",  zone: 1, rackCount: 9,  pairedWith: "mastin",    order: 16, icon: "🐶" },
  { id: "mastin",    name: "Mastín",    oldAisle: "Q",  zone: 1, rackCount: 9,  pairedWith: "doberman",  order: 17, icon: "🐕" },
  { id: "spaniel",   name: "Spaniel",   oldAisle: "R",  zone: 1, rackCount: 9,  pairedWith: "setter",    order: 18, icon: "🐾" },
  { id: "setter",    name: "Setter",    oldAisle: "S",  zone: 1, rackCount: 9,  pairedWith: "spaniel",   order: 19, icon: "🐶" },

  // ── Zone 2 (right of separator wall) ────────────────────────────────────
  { id: "pointer",   name: "Pointer",   oldAisle: "T",  zone: 2, rackCount: 9,  pairedWith: null,         order: 20, icon: "🐕" },
  { id: "sabueso",   name: "Sabueso",   oldAisle: "U",  zone: 2, rackCount: 9,  pairedWith: "cocker",     order: 21, icon: "🐾" },
  { id: "cocker",    name: "Cocker",    oldAisle: "V",  zone: 2, rackCount: 9,  pairedWith: "sabueso",    order: 22, icon: "🐶" },
  { id: "corgi",     name: "Corgi",     oldAisle: "W",  zone: 2, rackCount: 9,  pairedWith: "schnauzer",  order: 23, icon: "🐕" },
  { id: "schnauzer", name: "Schnauzer", oldAisle: "X",  zone: 2, rackCount: 9,  pairedWith: "corgi",      order: 24, icon: "🐾" },
  { id: "basset",    name: "Basset",    oldAisle: "Y",  zone: 2, rackCount: 9,  pairedWith: "maltes",     order: 25, icon: "🐶" },
  { id: "maltes",    name: "Maltés",    oldAisle: "Z",  zone: 2, rackCount: 9,  pairedWith: "basset",     order: 26, icon: "🐕" },
  { id: "chihuahua", name: "Chihuahua", oldAisle: "AA", zone: 2, rackCount: 9,  pairedWith: "rottweiler", order: 27, icon: "🐾" },
  { id: "rottweiler",name: "Rottweiler",oldAisle: "AB", zone: 2, rackCount: 9,  pairedWith: "chihuahua",  order: 28, icon: "🐶" },
];

/** Map from circuit id to Circuit */
export const CIRCUIT_BY_ID = Object.fromEntries(
  CIRCUITS.map((c) => [c.id, c])
) as Record<string, Circuit>;

/** Map from old aisle letter to Circuit */
export const CIRCUIT_BY_OLD_AISLE = Object.fromEntries(
  CIRCUITS.map((c) => [c.oldAisle, c])
) as Record<string, Circuit>;

// ─── Aerial grid ─────────────────────────────────────────────────────────────

/**
 * Describes one column in the aerial view.
 * The view is drawn left-to-right = circuits across warehouse,
 * top-to-bottom = rack positions (back → front).
 */
export type AerialColumnType = "wall" | "rack" | "aisle" | "separator";

export interface AerialColumn {
  type: AerialColumnType;
  circuitId?: string; // only for type=rack
  label?: string;
}

/**
 * Build the aerial view columns from left to right.
 * Wall → Dálmata → aisle → Poodle|Bulldog → aisle → ...
 * ... → Setter → separator → Pointer → aisle → ...
 */
export function buildAerialColumns(): AerialColumn[] {
  const cols: AerialColumn[] = [];

  // Zone 1
  cols.push({ type: "wall", label: "Pared" });
  cols.push({ type: "rack", circuitId: "dalmata", label: "Dálmata" });
  cols.push({ type: "aisle" });

  const zone1Pairs: [string, string][] = [
    ["poodle", "bulldog"],
    ["beagle", "labrador"],
    ["golden", "husky"],
    ["collie", "pastor"],
    ["boxer", "terrier"],
    ["shitzu", "pug"],
    ["akita", "galgo"],
    ["doberman", "mastin"],
    ["spaniel", "setter"],
  ];

  for (const [left, right] of zone1Pairs) {
    cols.push({ type: "rack", circuitId: left, label: CIRCUIT_BY_ID[left].name });
    cols.push({ type: "rack", circuitId: right, label: CIRCUIT_BY_ID[right].name });
    cols.push({ type: "aisle" });
  }

  // Separator wall
  cols.push({ type: "separator", label: "Muro" });

  // Zone 2
  cols.push({ type: "rack", circuitId: "pointer", label: "Pointer" });
  cols.push({ type: "aisle" });

  const zone2Pairs: [string, string][] = [
    ["sabueso", "cocker"],
    ["corgi", "schnauzer"],
    ["basset", "maltes"],
    ["chihuahua", "rottweiler"],
  ];

  for (const [left, right] of zone2Pairs) {
    cols.push({ type: "rack", circuitId: left, label: CIRCUIT_BY_ID[left].name });
    cols.push({ type: "rack", circuitId: right, label: CIRCUIT_BY_ID[right].name });
    cols.push({ type: "aisle" });
  }

  cols.push({ type: "wall", label: "Pared" });

  return cols;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a circuit-based location name into parts.
 * Supports:
 *   "Husky 3-C1"  → rack 3, level C, position 1
 *   "Husky 3-C2"  → rack 3, level C, position 2
 *   "Husky 3-C"   → rack 3, level C, position undefined (legacy)
 */
export function parseCircuitLocation(name: string): {
  circuitId: string;
  circuitName: string;
  rack: number;
  level: string;
  position?: number;
} | null {
  // "Husky 3-C1", "Dálmata 10-A2", or legacy "Husky 3-C"
  const match = name.match(/^(\S+)\s+(\d{1,2})-([A-Ea-e])([12])?$/);
  if (!match) return null;

  const circuitName = match[1];
  const rack = parseInt(match[2]);
  const level = match[3].toUpperCase();
  const position = match[4] ? parseInt(match[4]) : undefined;

  // Find circuit by name (case-insensitive)
  const circuit = CIRCUITS.find(
    (c) => c.name.toLowerCase() === circuitName.toLowerCase()
  );
  if (!circuit) return null;

  return { circuitId: circuit.id, circuitName: circuit.name, rack, level, position };
}

/**
 * Build an Odoo-compatible location name from circuit parts.
 * With position: "Husky 3-C1"  Without: "Husky 3-C"
 */
export function buildCircuitLocationName(
  circuitName: string,
  rack: number,
  level: string,
  position?: number
): string {
  const base = `${circuitName} ${rack}-${level.toUpperCase()}`;
  return position ? `${base}${position}` : base;
}

/**
 * Get total location count for a circuit (2 positions per level).
 */
export function getCircuitLocationCount(circuit: Circuit): number {
  return circuit.rackCount * LEVELS.length * POSITIONS.length;
}

/**
 * Get all location names for a circuit (with positions).
 */
export function getCircuitLocationNames(circuit: Circuit): string[] {
  const names: string[] = [];
  for (let rack = 1; rack <= circuit.rackCount; rack++) {
    for (const level of LEVELS) {
      for (const pos of POSITIONS) {
        names.push(buildCircuitLocationName(circuit.name, rack, level, pos));
      }
    }
  }
  return names;
}

/**
 * Color palette for circuits in the aerial view.
 * Pairs share similar hues, zones have distinct palettes.
 */
const ZONE_1_COLORS = [
  "#f59e0b", // amber
  "#3b82f6", "#3b82f6", // blue pair
  "#10b981", "#10b981", // green pair
  "#8b5cf6", "#8b5cf6", // violet pair
  "#ec4899", "#ec4899", // pink pair
  "#f97316", "#f97316", // orange pair
  "#06b6d4", "#06b6d4", // cyan pair
  "#84cc16", "#84cc16", // lime pair
  "#e11d48", "#e11d48", // rose pair
  "#6366f1", "#6366f1", // indigo pair
];

const ZONE_2_COLORS = [
  "#14b8a6", // teal
  "#a855f7", "#a855f7", // purple pair
  "#f43f5e", "#f43f5e", // red pair
  "#0ea5e9", "#0ea5e9", // sky pair
  "#eab308", "#eab308", // yellow pair
];

export function getCircuitColor(circuit: Circuit): string {
  const zone1 = CIRCUITS.filter((c) => c.zone === 1);
  const zone2 = CIRCUITS.filter((c) => c.zone === 2);

  if (circuit.zone === 1) {
    const idx = zone1.findIndex((c) => c.id === circuit.id);
    return ZONE_1_COLORS[idx] ?? "#64748b";
  } else {
    const idx = zone2.findIndex((c) => c.id === circuit.id);
    return ZONE_2_COLORS[idx] ?? "#64748b";
  }
}
