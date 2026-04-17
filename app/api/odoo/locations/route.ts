import { NextRequest, NextResponse } from "next/server";
import { odooCall, type OdooLocation } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const sid = await getSessionId();
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouse_id");

    // Build domain: only internal locations
    const domain: unknown[] = [["usage", "=", "internal"], ["active", "=", true]];

    // If warehouse_id is provided, filter by parent location chain
    // We use child_of on the stock location of the warehouse
    if (warehouseId) {
      // Get the warehouse's stock location ID
      const warehouses = await odooCall<{ id: number; lot_stock_id: [number, string] }[]>(        sid,        "stock.warehouse",
        "search_read",
        [[["id", "=", parseInt(warehouseId)]]],
        { fields: ["id", "lot_stock_id"] }
      );
      if (warehouses.length > 0) {
        const stockLocationId = warehouses[0].lot_stock_id[0];
        domain.push(["id", "child_of", stockLocationId]);
      }
    }

    const locations = await odooCall<OdooLocation[]>(
      sid,
      "stock.location",
      "search_read",
      [domain],
      {
        fields: ["id", "name", "complete_name", "location_id", "usage"],
        order: "complete_name asc",
      }
    );

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("[API /odoo/locations]", error);
    return NextResponse.json(
      { error: "Error al consultar ubicaciones" },
      { status: 500 }
    );
  }
}
