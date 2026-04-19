import { NextRequest, NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

interface StockMoveResult {
  id: number;
  product_id: [number, string];
  product_uom_qty: number;
  quantity: number;
  state: string;
  location_id: [number, string];
  location_dest_id: [number, string];
  picking_id: [number, string] | false;
  date: string;
  reference: string | false;
}

export async function GET(request: NextRequest) {
  try {
    const sid = await getSessionId();
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("location_id");
    const limit = parseInt(searchParams.get("limit") ?? "30");

    if (!locationId) {
      return NextResponse.json(
        { error: "location_id requerido" },
        { status: 400 }
      );
    }

    const locId = parseInt(locationId);

    // Get moves where this location is either source or destination
    const moves = await odooCall<StockMoveResult[]>(
      sid,
      "stock.move",
      "search_read",
      [
        [
          "|",
          ["location_id", "=", locId],
          ["location_dest_id", "=", locId],
          ["state", "=", "done"],
        ],
      ],
      {
        fields: [
          "id",
          "product_id",
          "product_uom_qty",
          "quantity",
          "state",
          "location_id",
          "location_dest_id",
          "picking_id",
          "date",
          "reference",
        ],
        limit,
        order: "date desc",
      }
    );

    return NextResponse.json({ moves });
  } catch (error) {
    console.error("[API /odoo/stock/moves]", error);
    return NextResponse.json(
      { error: "Error al consultar historial de movimientos" },
      { status: 500 }
    );
  }
}
