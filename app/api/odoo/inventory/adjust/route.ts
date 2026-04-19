import { NextRequest, NextResponse } from "next/server";
import { odooCall } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

/**
 * POST /api/odoo/inventory/adjust
 * Applies inventory adjustments for a location.
 * Body: { locationId: number, adjustments: [{ productId: number, countedQty: number }] }
 *
 * Uses Odoo's stock.quant action_apply_inventory to create adjustments.
 */
export async function POST(request: NextRequest) {
  try {
    const sid = await getSessionId();
    const { locationId, adjustments } = (await request.json()) as {
      locationId: number;
      adjustments: { productId: number; countedQty: number }[];
    };

    if (!locationId || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { error: "Se requiere locationId y al menos un ajuste" },
        { status: 400 }
      );
    }

    const results: { productId: number; success: boolean; error?: string }[] = [];

    for (const adj of adjustments) {
      try {
        // Find existing quant for this product+location
        const quants = await odooCall<{ id: number; quantity: number }[]>(
          sid,
          "stock.quant",
          "search_read",
          [
            [
              ["product_id", "=", adj.productId],
              ["location_id", "=", locationId],
            ],
          ],
          { fields: ["id", "quantity"], limit: 1 }
        );

        if (quants.length > 0) {
          // Update existing quant's inventory_quantity and apply
          await odooCall(sid, "stock.quant", "write", [
            [quants[0].id],
            { inventory_quantity: adj.countedQty },
          ]);
          await odooCall(sid, "stock.quant", "action_apply_inventory", [
            [quants[0].id],
          ]);
        } else {
          // Create a new quant with inventory adjustment
          const newQuantId = await odooCall<number>(
            sid,
            "stock.quant",
            "create",
            [
              {
                product_id: adj.productId,
                location_id: locationId,
                inventory_quantity: adj.countedQty,
              },
            ]
          );
          await odooCall(sid, "stock.quant", "action_apply_inventory", [
            [newQuantId],
          ]);
        }

        results.push({ productId: adj.productId, success: true });
      } catch (e) {
        results.push({
          productId: adj.productId,
          success: false,
          error: e instanceof Error ? e.message : "Error desconocido",
        });
      }
    }

    const allOk = results.every((r) => r.success);

    return NextResponse.json(
      { success: allOk, results },
      { status: allOk ? 200 : 207 }
    );
  } catch (error) {
    console.error("[API /odoo/inventory/adjust]", error);
    return NextResponse.json(
      { error: "Error al aplicar ajustes de inventario" },
      { status: 500 }
    );
  }
}
