const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;

// Fallback service-account credentials for background calls (no user session)
const ODOO_USER = process.env.ODOO_USER!;
const ODOO_API_KEY = process.env.ODOO_API_KEY!;

// Service-account session cache
let serviceSession: { sessionId: string; uid: number; ts: number } | null = null;
const SESSION_TTL = 7 * 3600 * 1000; // 7 hours

async function getServiceSession(): Promise<{ sessionId: string; uid: number }> {
  if (serviceSession && Date.now() - serviceSession.ts < SESSION_TTL) {
    return serviceSession;
  }

  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_API_KEY },
    }),
  });

  if (!res.ok) throw new Error("Service account auth HTTP error: " + res.status);

  const data = await res.json() as {
    result?: { uid: number | false };
    error?: unknown;
  };

  const uid = data?.result?.uid;
  if (!uid) throw new Error("Authentication failed: invalid service credentials");

  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/session_id=([^;]+)/);
  if (!match) throw new Error("No session_id in Odoo response");

  serviceSession = { sessionId: match[1], uid, ts: Date.now() };
  return serviceSession;
}

export async function odooCall<T>(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {},
  sessionId?: string
): Promise<T> {
  let sid: string;
  if (sessionId) {
    sid = sessionId;
  } else {
    const svc = await getServiceSession();
    sid = svc.sessionId;
  }

  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sid}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        model,
        method,
        args,
        kwargs,
      },
    }),
  });

  if (!res.ok) throw new Error(`Odoo HTTP error ${res.status}`);

  const data = await res.json() as { result?: T; error?: { message?: string; data?: { message?: string } } };

  if (data.error) {
    const msg = data.error.data?.message ?? data.error.message ?? "Odoo error";
    throw new Error(msg);
  }

  return data.result as T;
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
