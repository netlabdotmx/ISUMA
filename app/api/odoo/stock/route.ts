import { NextRequest, NextResponse } from "next/server";
import { odooCall, type OdooQuant } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const sid = await getSessionId();
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
      sid,
      "stock.quant",
      "search_read",
      [domain],
      {
        fields: ["id", "product_id", "location_id", "quantity", "reserved_quantity"],
        order: "quantity desc",
      }
    );

    // Batch-fetch product codes (x_sku / default_code)
    let productCodes: Record<number, string> = {};
    try {
      const productIds = [...new Set(
        quants.map((q) => (Array.isArray(q.product_id) ? q.product_id[0] : 0)).filter(Boolean)
      )];
      if (productIds.length > 0) {
        const products = await odooCall<{ id: number; default_code: string | false; x_sku: string | false }[]>(
          sid,
          "product.product",
          "search_read",
          [[["id", "in", productIds]]],
          { fields: ["id", "default_code", "x_sku"] }
        );
        for (const p of products) {
          const code = (p.x_sku || p.default_code || "") as string;
          if (code) productCodes[p.id] = code;
        }
      }
    } catch (e) {
      console.error("[API /odoo/stock] Failed to fetch product codes, continuing without them", e);
    }

    return NextResponse.json({ quants, productCodes });
  } catch (error) {
    console.error("[API /odoo/stock]", error);
    return NextResponse.json(
      { error: "Error al consultar inventario" },
      { status: 500 }
    );
  }
}
