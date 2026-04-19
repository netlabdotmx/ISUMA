/**
 * Optimise a picking route by sorting moves based on physical warehouse position.
 * Location names follow the pattern: WAREHOUSE/RACK-COLUMN-LEVEL (e.g. WH/A-03-2).
 * Moves without a parseable location go to the end of the route.
 */

interface RouteMove {
  id: number;
  location_id: [number, string];
}

interface ParsedPosition {
  rack: string;
  column: number;
  level: number;
}

function parsePosition(locationName: string): ParsedPosition | null {
  // Match patterns like "WH/A-03-2" or "Stock/B-12-1"
  const match = locationName.match(/([A-Za-z]+)-(\d+)-(\d+)/);
  if (!match) return null;
  return {
    rack: match[1].toUpperCase(),
    column: parseInt(match[2], 10),
    level: parseInt(match[3], 10),
  };
}

export function optimizePickingRoute<T extends RouteMove>(moves: T[]): T[] {
  return [...moves].sort((a, b) => {
    const posA = parsePosition(a.location_id[1]);
    const posB = parsePosition(b.location_id[1]);

    // Moves without parseable position go to the end
    if (!posA && !posB) return 0;
    if (!posA) return 1;
    if (!posB) return -1;

    // Sort by rack → column → level (bottom-up for ergonomics)
    if (posA.rack !== posB.rack) return posA.rack.localeCompare(posB.rack);
    if (posA.column !== posB.column) return posA.column - posB.column;
    return posA.level - posB.level;
  });
}
