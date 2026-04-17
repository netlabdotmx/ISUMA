import { NextRequest, NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

export async function GET(_request: NextRequest) {
  try {
    // Aggregate stats for the dashboard
    const [
      productCount,
      locationCount,
      pendingCount,
      incomingPendingCount,
    ] = await Promise.all([
      odooCall<number>("product.product", "search_count", [
        [["type", "in", ["consu", "product"]]],
      ]),
      odooCall<number>("stock.location", "search_count", [
        [["usage", "=", "internal"], ["active", "=", true]],
      ]),
      odooCall<number>("stock.picking", "search_count", [
        [["state", "in", ["draft", "waiting", "confirmed", "assigned"]]],
      ]),
      odooCall<number>("stock.picking", "search_count", [
        [
          ["state", "in", ["draft", "waiting", "confirmed", "assigned"]],
          ["picking_type_id.code", "=", "incoming"],
        ],
      ]),
    ]);

    return NextResponse.json({
      productCount,
      locationCount,
      pendingCount,
      incomingPendingCount,
    });
  } catch (error) {
    console.error("[API /odoo/stats]", error);
    return NextResponse.json(
      { error: "Error al consultar estadísticas" },
      { status: 500 }
    );
  }
}
