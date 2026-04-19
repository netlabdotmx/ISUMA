import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getSessionId } from "@/lib/session";

/**
 * Warehouse layout persistence.
 * Stores the grid JSON in a local file (data/warehouse-layout.json).
 * In production this should be backed by Odoo (isuma.warehouse.layout) or a DB.
 */

const DATA_DIR = join(process.cwd(), "data");
const LAYOUT_FILE = join(DATA_DIR, "warehouse-layout.json");

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

// GET /api/odoo/warehouse-layout — Read saved layout
export async function GET() {
  try {
    await getSessionId(); // auth check
    await ensureDataDir();

    try {
      const data = await readFile(LAYOUT_FILE, "utf-8");
      return NextResponse.json(JSON.parse(data));
    } catch {
      // File doesn't exist yet
      return NextResponse.json({ grid: null });
    }
  } catch (error) {
    console.error("[API /odoo/warehouse-layout GET]", error);
    return NextResponse.json(
      { error: "Error al leer layout" },
      { status: 500 }
    );
  }
}

// POST /api/odoo/warehouse-layout — Save layout
export async function POST(request: NextRequest) {
  try {
    await getSessionId(); // auth check
    const body = await request.json();

    if (!body.grid || !Array.isArray(body.grid)) {
      return NextResponse.json(
        { error: "Se requiere un grid válido" },
        { status: 400 }
      );
    }

    await ensureDataDir();
    await writeFile(
      LAYOUT_FILE,
      JSON.stringify({ grid: body.grid, updatedAt: new Date().toISOString() }),
      "utf-8"
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /odoo/warehouse-layout POST]", error);
    return NextResponse.json(
      { error: "Error al guardar layout" },
      { status: 500 }
    );
  }
}
