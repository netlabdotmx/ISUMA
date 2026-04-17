import { NextRequest, NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";

// GET /api/odoo/pickings/[id] — Picking detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pickingId = parseInt(id);

    if (isNaN(pickingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const [picking] = await odooCall<
      {
        id: number;
        name: string;
        state: string;
        picking_type_id: [number, string];
        location_id: [number, string];
        location_dest_id: [number, string];
        origin: string | false;
        scheduled_date: string | false;
        date_done: string | false;
        create_date: string;
        move_ids: number[];
      }[]
    >(
      "stock.picking",
      "search_read",
      [[["id", "=", pickingId]]],
      {
        fields: [
          "id", "name", "state", "picking_type_id",
          "location_id", "location_dest_id",
          "origin", "scheduled_date", "date_done", "create_date",
          "move_ids",
        ],
      }
    );

    if (!picking) {
      return NextResponse.json({ error: "Albarán no encontrado" }, { status: 404 });
    }

    // Get move lines
    const moves = await odooCall<
      {
        id: number;
        product_id: [number, string];
        product_uom_qty: number;
        quantity: number;
        state: string;
        location_id: [number, string];
        location_dest_id: [number, string];
      }[]
    >(
      "stock.move",
      "search_read",
      [[["picking_id", "=", pickingId]]],
      {
        fields: [
          "id", "product_id", "product_uom_qty",
          "quantity", "state", "location_id", "location_dest_id",
        ],
      }
    );

    return NextResponse.json({ picking, moves });
  } catch (error) {
    console.error("[API /odoo/pickings/:id GET]", error);
    return NextResponse.json(
      { error: "Error al consultar albarán" },
      { status: 500 }
    );
  }
}

// POST /api/odoo/pickings/[id] — Actions on picking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pickingId = parseInt(id);
    const { action, move_quantities } = await request.json() as {
      action: "confirm" | "validate" | "cancel";
      move_quantities?: Record<number, number>;
    };

    if (isNaN(pickingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (action === "confirm") {
      await odooCall("stock.picking", "action_confirm", [[pickingId]]);
      return NextResponse.json({ success: true });
    }

    if (action === "validate") {
      // Update done quantities if provided
      if (move_quantities) {
        for (const [moveId, qty] of Object.entries(move_quantities)) {
          await odooCall("stock.move", "write", [
            [parseInt(moveId)],
            { quantity: qty },
          ]);
        }
      }
      await odooCall("stock.picking", "button_validate", [[pickingId]]);
      return NextResponse.json({ success: true });
    }

    if (action === "cancel") {
      await odooCall("stock.picking", "action_cancel", [[pickingId]]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  } catch (error) {
    console.error("[API /odoo/pickings/:id POST]", error);
    return NextResponse.json(
      { error: "Error al ejecutar acción" },
      { status: 500 }
    );
  }
}
