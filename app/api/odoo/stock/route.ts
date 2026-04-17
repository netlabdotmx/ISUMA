import { NextRequest, NextResponse } from "next/server";
import { odooCall, type OdooQuant } from "@/lib/odoo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("location_id");
    const productId = searchParams.get("product_id");

    const domain: unknown[] = [["quantity", ">", 0]];

    if (locationId) {
      domain.push(["location_id", "=", parseInt(locationId)]);
    }

    if (productId) {
      domain.push(["product_id", "=", parseInt(productId)]);
      // Include all internal locations when searching by product
      domain.push(["location_id.usage", "=", "internal"]);
    }

    const quants = await odooCall<OdooQuant[]>(
      "stock.quant",
      "search_read",
      [domain],
      {
        fields: ["id", "product_id", "location_id", "quantity", "reserved_quantity"],
        order: "quantity desc",
      }
    );

    return NextResponse.json({ quants });
  } catch (error) {
    console.error("[API /odoo/stock]", error);
    return NextResponse.json(
      { error: "Error al consultar inventario" },
      { status: 500 }
    );
  }
}
