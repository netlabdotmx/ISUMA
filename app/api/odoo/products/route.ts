import { NextRequest, NextResponse } from "next/server";
import { odooCall, type OdooProduct } from "@/lib/odoo";
import { getSessionId } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const sid = await getSessionId();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const barcode = searchParams.get("barcode") ?? "";
    const ids = searchParams.get("ids") ?? "";
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let domain: unknown[];

    if (ids) {
      // Fetch specific products by ID
      const idList = ids.split(",").map(Number).filter(Boolean);
      domain = [["id", "in", idList]];
    } else if (barcode) {
      // Exact barcode lookup: check barcode field and default_code
      domain = [
        "|",
        ["barcode", "=", barcode],
        ["default_code", "=", barcode],
        ["type", "in", ["consu", "product"]],
      ];
    } else if (search) {
      domain = [
        "|",
        "|",
        ["name", "ilike", search],
        ["default_code", "ilike", search],
        ["barcode", "ilike", search],
        ["type", "in", ["consu", "product"]],
      ];
    } else {
      domain = [["type", "in", ["consu", "product"]]];
    }

    const products = await odooCall<OdooProduct[]>(
      sid,
      "product.product",
      "search_read",
      [domain],
      {
        fields: ["id", "name", "default_code", "barcode", "qty_available", "type"],
        limit,
        offset,
        order: "name asc",
      }
    );

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[API /odoo/products]", error);
    return NextResponse.json(
      { error: "Error al consultar productos" },
      { status: 500 }
    );
  }
}
