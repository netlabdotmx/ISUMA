import { NextRequest, NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

export async function GET(_request: NextRequest) {
  try {
    const sid = await getSessionId();

    // Aggregate stats for the dashboard
    const [
      productCount,
      locationCount,
      pendingCount,
      incomingPendingCount,
    ] = await Promise.all([
      odooCall<number>(sid, "product.product", "search_count", [
        [["type", "in", ["consu", "product"]]],
      ]),
      odooCall<number>(sid, "stock.location", "search_count", [
        [["usage", "=", "internal"], ["active", "=", true]],
      ]),
      odooCall<number>(sid, "stock.picking", "search_count", [
        [["state", "in", ["draft", "waiting", "confirmed", "assigned"]]],
      ]),
      odooCall<number>(sid, "stock.picking", "search_count", [
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
