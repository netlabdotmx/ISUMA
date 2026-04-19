import { NextRequest, NextResponse } from "next/server";
import { odooCall, type OdooPicking } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

interface CreatePickingBody {
  picking_type_id: number;
  origin?: string;
  location_id: number;
  location_dest_id: number;
  scheduled_date?: string;
  move_lines: {
    product_id: number;
    product_qty: number;
    product_name: string;
    location_id: number;
    location_dest_id: number;
  }[];
  auto_confirm?: boolean;
  auto_validate?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const sid = await getSessionId();
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const code = searchParams.get("code"); // incoming | outgoing | internal
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const domain: unknown[] = [];

    if (state === "pending") {
      domain.push(["state", "in", ["draft", "waiting", "confirmed", "assigned"]]);
    } else if (state === "done") {
      domain.push(["state", "=", "done"]);
    } else {
      domain.push(["state", "!=", "cancel"]);
    }

    if (code) {
      domain.push(["picking_type_id.code", "=", code]);
    }

    const pickings = await odooCall<OdooPicking[]>(
      sid,
      "stock.picking",
      "search_read",
      [domain],
      {
        fields: [
          "id", "name", "state", "picking_type_id",
          "location_id", "location_dest_id",
          "origin", "scheduled_date", "date_done", "create_date",
          "move_ids", "partner_id", "priority",
        ],
        limit,
        offset,
        order: searchParams.get("order") || "create_date desc",
      }
    );

    return NextResponse.json({ pickings });
  } catch (error) {
    console.error("[API /odoo/pickings GET]", error);
    return NextResponse.json(
      { error: "Error al consultar albaranes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sid = await getSessionId();
    const body: CreatePickingBody = await request.json();

    // Validate required fields
    if (
      !body.picking_type_id ||
      !body.location_id ||
      !body.location_dest_id ||
      !Array.isArray(body.move_lines) ||
      body.move_lines.length === 0
    ) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // 1. Create the picking
    const pickingId = await odooCall<number>(sid, "stock.picking", "create", [
      {
        picking_type_id: body.picking_type_id,
        origin: body.origin ?? "",
        location_id: body.location_id,
        location_dest_id: body.location_dest_id,
        ...(body.scheduled_date && { scheduled_date: body.scheduled_date }),
      },
    ]);

    // 2. Create stock.move for each line
    const moveIds: number[] = [];
    for (const line of body.move_lines) {
      const moveId = await odooCall<number>(sid, "stock.move", "create", [
        {
          picking_id: pickingId,
          product_id: line.product_id,
          product_uom_qty: line.product_qty,
          product_uom: 1,
          location_id: line.location_id,
          location_dest_id: line.location_dest_id,
        },
      ]);
      moveIds.push(moveId);
    }

    // 3. Confirm if requested
    if (body.auto_confirm || body.auto_validate) {
      await odooCall(sid, "stock.picking", "action_confirm", [[pickingId]]);
    }

    // 4. Validate if requested
    if (body.auto_validate) {
      // Set done quantities equal to demanded quantities
      const moveLines = await odooCall<{ id: number; product_uom_qty: number }[]>(
        sid,
        "stock.move",
        "search_read",
        [[["picking_id", "=", pickingId]]],
        { fields: ["id", "product_uom_qty"] }
      );

      // Assign move_line_ids with done quantities
      for (const mv of moveLines) {
        await odooCall(sid, "stock.move", "write", [
          [mv.id],
          { quantity: mv.product_uom_qty },
        ]);
      }

      await odooCall(sid, "stock.picking", "button_validate", [[pickingId]]);
    }

    return NextResponse.json({ pickingId, moveIds }, { status: 201 });
  } catch (error) {
    console.error("[API /odoo/pickings POST]", error);
    return NextResponse.json(
      { error: "Error al crear albarán" },
      { status: 500 }
    );
  }
}
