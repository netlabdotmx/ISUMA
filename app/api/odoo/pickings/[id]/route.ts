import { NextRequest, NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

// GET /api/odoo/pickings/[id] — Picking detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sid = await getSessionId();
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
      sid,
      "stock.picking",
      "search_read",
      [[["id", "=", pickingId]]],
      {
        fields: [
          "id", "name", "state", "picking_type_id",
          "location_id", "location_dest_id",
          "origin", "scheduled_date", "date_done", "create_date",
          "move_ids", "partner_id", "priority",
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
      sid,
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
    const sid = await getSessionId();
    const { id } = await params;
    const pickingId = parseInt(id);
    const { action, move_quantities, return_lines } = await request.json() as {
      action: "confirm" | "validate" | "cancel" | "return";
      move_quantities?: Record<number, number>;
      return_lines?: { move_id: number; quantity: number; reason?: string }[];
    };

    if (isNaN(pickingId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (action === "confirm") {
      await odooCall(sid, "stock.picking", "action_confirm", [[pickingId]]);
      return NextResponse.json({ success: true });
    }

    if (action === "validate") {
      // Update done quantities if provided
      if (move_quantities) {
        for (const [moveId, qty] of Object.entries(move_quantities)) {
          await odooCall(sid, "stock.move", "write", [
            [parseInt(moveId)],
            { quantity: qty },
          ]);
        }
      }
      await odooCall(sid, "stock.picking", "button_validate", [[pickingId]]);
      return NextResponse.json({ success: true });
    }

    if (action === "cancel") {
      await odooCall(sid, "stock.picking", "action_cancel", [[pickingId]]);
      return NextResponse.json({ success: true });
    }

    if (action === "return") {
      if (!return_lines || return_lines.length === 0) {
        return NextResponse.json(
          { error: "Se requieren líneas de devolución" },
          { status: 400 }
        );
      }

      // Create return wizard with active_id context
      const ctx = { active_id: pickingId, active_ids: [pickingId], active_model: "stock.picking" };

      // First create default values from the wizard
      const defaults = await odooCall(
        sid,
        "stock.return.picking",
        "default_get",
        [["return_moves", "picking_id"]],
        { context: ctx }
      ) as { return_moves?: [number, number, { move_id: number; quantity: number }][] };

      // Build return moves from user's selection
      const returnMoves = return_lines.map((l) => [
        0, 0, { move_id: l.move_id, quantity: l.quantity },
      ]);

      const wizardId = await odooCall(
        sid,
        "stock.return.picking",
        "create",
        [{
          picking_id: pickingId,
          return_moves: returnMoves,
        }],
        { context: ctx }
      );

      // Execute the return wizard → creates the return picking
      const result = await odooCall<{ res_id?: number }>(
        sid,
        "stock.return.picking",
        "action_create_returns",
        [[wizardId]],
        { context: ctx }
      );

      // result usually has { res_id: <new_picking_id> }
      const returnPickingId = result?.res_id;
      return NextResponse.json({ success: true, return_picking_id: returnPickingId });
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
