const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;

// --- Low-level JSON-RPC with session ---

async function jsonRpcWithSession(
  url: string,
  params: Record<string, unknown>,
  sessionId?: string
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["Cookie"] = `session_id=${sessionId}`;

  const res = await fetch(`${ODOO_URL}${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params,
      id: Date.now(),
    }),
  });

  const data = await res.json() as {
    result?: unknown;
    error?: { message?: string; data?: { message?: string } };
  };

  if (data.error) {
    const msg = data.error.data?.message ?? data.error.message ?? "Odoo error";
    throw new Error(msg);
  }

  return data.result;
}

// --- Authentication ---

export async function authenticateUser(login: string, password: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { db: ODOO_DB, login, password },
    }),
  });

  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session_id=([^;]+)/);
  const sessionId = match?.[1] ?? "";

  const data = await res.json() as {
    result?: { uid: number | false; name: string; username: string };
    error?: unknown;
  };

  if (!data.result?.uid) throw new Error("Credenciales inválidas");

  return {
    uid: data.result.uid as number,
    name: data.result.name,
    username: data.result.username,
    sessionId,
  };
}

// --- Main call function (requires user sessionId) ---

export async function odooCall<T>(
  sessionId: string,
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  const result = await jsonRpcWithSession(
    "/web/dataset/call_kw",
    { model, method, args, kwargs },
    sessionId
  );
  return result as T;
}

// ============================================================
// Typed helpers
// ============================================================

export interface OdooProduct {
  id: number;
  name: string;
  default_code: string | false;
  qty_available: number;
  type: string;
}

export interface OdooLocation {
  id: number;
  name: string;
  complete_name: string;
  location_id: [number, string] | false;
  usage: string;
  x_physical_rack?: string | false;
  x_physical_column?: number | false;
  x_physical_level?: number | false;
  x_abc_zone?: string | false;
}

export interface OdooQuant {
  id: number;
  product_id: [number, string];
  location_id: [number, string];
  quantity: number;
  reserved_quantity: number;
}

export interface OdooPicking {
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
  partner_id?: [number, string] | false;
  priority?: string;
}

export interface OdooMove {
  id: number;
  product_id: [number, string];
  product_uom_qty: number;
  quantity: number;
  state: string;
  location_id: [number, string];
  location_dest_id: [number, string];
}
