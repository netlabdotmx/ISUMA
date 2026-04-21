/**
 * Circuit-based warehouse naming system.
 *
 * Each aisle face uses its letter (A–Z, AA, AB) as the circuit name.
 * Location format: "Letter Rack#-LevelPosition"
 *   e.g. "G 3-C1" = Aisle G, rack 3, level C, position 1 (left)
 *
 * Rack# counts from 1 (front / loading docks) to 9–10 (back wall).
 * Level goes from A (ground) to E (top, ~5th pallet height).
 * Position: 1 (left) or 2 (right) — 2 pallets side by side.
 */

// ─── Circuit definition ──────────────────────────────────────────────────────

export interface Circuit {
  id: string;          // lowercase slug, e.g. "a", "g", "aa"
  name: string;        // display name = aisle letter, e.g. "A", "G", "AA"
  zone: 1 | 2;        // Zone 1 (left of wall) or Zone 2 (right)
  rackCount: number;   // total racks including back wall
  pairedWith: string | null; // id of the circuit sharing the physical rack structure
  order: number;       // position within aerial grid
  /** Levels at the LAST rack (back wall) that are maneuvering space, not storage */
  backManeuveringLevels?: string[];
}

export const LEVELS = ["A", "B", "C", "D", "E"] as const;
export type Level = (typeof LEVELS)[number];

/** Positions within a rack level (2 pallets side by side) */
export const POSITIONS = [1, 2] as const;
export type Position = (typeof POSITIONS)[number];

// ─── All 28 circuits ─────────────────────────────────────────────────────────

export const CIRCUITS: Circuit[] = [
  // ── Zone 1 (left of separator wall) ─────────────────────────────────────
  { id: "a",  name: "A",  zone: 1, rackCount: 10, pairedWith: null, order: 1  },
  { id: "b",  name: "B",  zone: 1, rackCount: 10, pairedWith: "c",  order: 2,  backManeuveringLevels: ["A"] },
  { id: "c",  name: "C",  zone: 1, rackCount: 10, pairedWith: "b",  order: 3,  backManeuveringLevels: ["A"] },
  { id: "d",  name: "D",  zone: 1, rackCount: 10, pairedWith: "e",  order: 4,  backManeuveringLevels: ["A"] },
  { id: "e",  name: "E",  zone: 1, rackCount: 10, pairedWith: "d",  order: 5,  backManeuveringLevels: ["A"] },
  { id: "f",  name: "F",  zone: 1, rackCount: 10, pairedWith: "g",  order: 6,  backManeuveringLevels: ["A"] },
  { id: "g",  name: "G",  zone: 1, rackCount: 10, pairedWith: "f",  order: 7,  backManeuveringLevels: ["A"] },
  { id: "h",  name: "H",  zone: 1, rackCount: 10, pairedWith: "i",  order: 8,  backManeuveringLevels: ["A"] },
  { id: "i",  name: "I",  zone: 1, rackCount: 10, pairedWith: "h",  order: 9,  backManeuveringLevels: ["A"] },
  { id: "j",  name: "J",  zone: 1, rackCount: 10, pairedWith: "k",  order: 10, backManeuveringLevels: ["A"] },
  { id: "k",  name: "K",  zone: 1, rackCount: 10, pairedWith: "j",  order: 11, backManeuveringLevels: ["A"] },
  { id: "l",  name: "L",  zone: 1, rackCount: 10, pairedWith: "m",  order: 12, backManeuveringLevels: ["A"] },
  { id: "m",  name: "M",  zone: 1, rackCount: 10, pairedWith: "l",  order: 13, backManeuveringLevels: ["A"] },
  { id: "n",  name: "N",  zone: 1, rackCount: 10, pairedWith: "o",  order: 14, backManeuveringLevels: ["A"] },
  { id: "o",  name: "O",  zone: 1, rackCount: 10, pairedWith: "n",  order: 15, backManeuveringLevels: ["A"] },
  { id: "p",  name: "P",  zone: 1, rackCount: 10, pairedWith: "q",  order: 16, backManeuveringLevels: ["A"] },
  { id: "q",  name: "Q",  zone: 1, rackCount: 10, pairedWith: "p",  order: 17, backManeuveringLevels: ["A"] },
  { id: "r",  name: "R",  zone: 1, rackCount: 10, pairedWith: "s",  order: 18, backManeuveringLevels: ["A"] },
  { id: "s",  name: "S",  zone: 1, rackCount: 10, pairedWith: "r",  order: 19, backManeuveringLevels: ["A"] },

  // ── Zone 2 (right of separator wall) ────────────────────────────────────
  { id: "t",  name: "T",  zone: 2, rackCount: 10, pairedWith: null,  order: 20, backManeuveringLevels: ["A"] },
  { id: "u",  name: "U",  zone: 2, rackCount: 10, pairedWith: "v",   order: 21, backManeuveringLevels: ["A"] },
  { id: "v",  name: "V",  zone: 2, rackCount: 10, pairedWith: "u",   order: 22, backManeuveringLevels: ["A"] },
  { id: "w",  name: "W",  zone: 2, rackCount: 10, pairedWith: "x",   order: 23, backManeuveringLevels: ["A"] },
  { id: "x",  name: "X",  zone: 2, rackCount: 10, pairedWith: "w",   order: 24, backManeuveringLevels: ["A"] },
  { id: "y",  name: "Y",  zone: 2, rackCount: 10, pairedWith: "z",   order: 25, backManeuveringLevels: ["A"] },
  { id: "z",  name: "Z",  zone: 2, rackCount: 10, pairedWith: "y",   order: 26, backManeuveringLevels: ["A"] },
  { id: "aa", name: "AA", zone: 2, rackCount: 10, pairedWith: "ab",  order: 27, backManeuveringLevels: ["A"] },
  { id: "ab", name: "AB", zone: 2, rackCount: 10, pairedWith: "aa",  order: 28, backManeuveringLevels: ["A"] },
];

/** Map from circuit id to Circuit */
export const CIRCUIT_BY_ID = Object.fromEntries(
  CIRCUITS.map((c) => [c.id, c])
) as Record<string, Circuit>;

// ─── Aerial grid ─────────────────────────────────────────────────────────────

export type AerialColumnType = "wall" | "rack" | "aisle" | "separator";

export interface AerialColumn {
  type: AerialColumnType;
  circuitId?: string;
  label?: string;
}

export function buildAerialColumns(): AerialColumn[] {
  const cols: AerialColumn[] = [];

  // Zone 1
  cols.push({ type: "wall", label: "Pared" });
  cols.push({ type: "rack", circuitId: "a", label: "A" });
  cols.push({ type: "aisle" });

  const zone1Pairs: [string, string][] = [
    ["b", "c"], ["d", "e"], ["f", "g"], ["h", "i"], ["j", "k"],
    ["l", "m"], ["n", "o"], ["p", "q"], ["r", "s"],
  ];

  for (const [left, right] of zone1Pairs) {
    cols.push({ type: "rack", circuitId: left, label: CIRCUIT_BY_ID[left].name });
    cols.push({ type: "rack", circuitId: right, label: CIRCUIT_BY_ID[right].name });
    cols.push({ type: "aisle" });
  }

  // Separator wall
  cols.push({ type: "separator", label: "Muro" });

  // Zone 2
  cols.push({ type: "rack", circuitId: "t", label: "T" });
  cols.push({ type: "aisle" });

  const zone2Pairs: [string, string][] = [
    ["u", "v"], ["w", "x"], ["y", "z"], ["aa", "ab"],
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
 * Parse a location name like "G 3-C1" or "AA 5-D2" into parts.
 */
export function parseCircuitLocation(name: string): {
  circuitId: string;
  circuitName: string;
  rack: number;
  level: string;
  position?: number;
} | null {
  // "G 3-C1", "AA 10-A2", or legacy "G 3-C"
  const match = name.match(/^([A-Z]{1,2})\s+(\d{1,2})-([A-Ea-e])([12])?$/i);
  if (!match) return null;

  const circuitName = match[1].toUpperCase();
  const rack = parseInt(match[2]);
  const level = match[3].toUpperCase();
  const position = match[4] ? parseInt(match[4]) : undefined;

  const circuit = CIRCUITS.find((c) => c.name === circuitName);
  if (!circuit) return null;

  return { circuitId: circuit.id, circuitName: circuit.name, rack, level, position };
}

/**
 * Build a location name from parts.
 * "G 3-C1" or without position: "G 3-C"
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

/** Check if a specific cell is maneuvering space (not usable for storage) */
export function isManeuveringCell(circuit: Circuit, rack: number, level: string): boolean {
  if (!circuit.backManeuveringLevels?.length) return false;
  if (rack !== circuit.rackCount) return false;
  return circuit.backManeuveringLevels.includes(level.toUpperCase());
}

/** Whether a rack has ANY maneuvering levels */
export function hasManeuveringAtRack(circuit: Circuit, rack: number): boolean {
  if (!circuit.backManeuveringLevels?.length) return false;
  return rack === circuit.rackCount;
}

export function getCircuitLocationCount(circuit: Circuit): number {
  const maneuveringCount = (circuit.backManeuveringLevels?.length ?? 0) * POSITIONS.length;
  return circuit.rackCount * LEVELS.length * POSITIONS.length - maneuveringCount;
}

export function getCircuitLocationNames(circuit: Circuit): string[] {
  const names: string[] = [];
  for (let rack = 1; rack <= circuit.rackCount; rack++) {
    for (const level of LEVELS) {
      if (isManeuveringCell(circuit, rack, level)) continue;
      for (const pos of POSITIONS) {
        names.push(buildCircuitLocationName(circuit.name, rack, level, pos));
      }
    }
  }
  return names;
}
