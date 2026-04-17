import { NextRequest, NextResponse } from "next/server";
import { odooCall, type OdooProduct } from "@/lib/odoo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const domain = search
      ? [["name", "ilike", search], ["type", "in", ["consu", "product"]]]
      : [["type", "in", ["consu", "product"]]];

    const products = await odooCall<OdooProduct[]>(
      "product.product",
      "search_read",
      [domain],
      {
        fields: ["id", "name", "default_code", "qty_available", "type"],
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
