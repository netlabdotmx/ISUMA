import type { OdooLocation } from "./odoo";

/**
 * Format a location's physical position for display.
 * Returns something like "A-03-2" or null if no physical data.
 */
export function formatPhysicalPosition(
  location: Pick<OdooLocation, "x_physical_rack" | "x_physical_column" | "x_physical_level">
): string | null {
  const rack = location.x_physical_rack;
  if (!rack) return null;

  const col = location.x_physical_column;
  const level = location.x_physical_level;

  let result = String(rack);
  if (col) result += `-${String(col).padStart(2, "0")}`;
  if (level) result += `-${level}`;

  return result;
}

/**
 * Get ABC zone badge class for a location.
 */
export function abcZoneClass(zone: string | false | undefined): string {
  switch (zone) {
    case "A":
      return "text-amber-400 bg-amber-400/10";
    case "B":
      return "text-blue-400 bg-blue-400/10";
    case "C":
      return "text-emerald-400 bg-emerald-400/10";
    default:
      return "text-slate-500 bg-slate-500/10";
  }
}
