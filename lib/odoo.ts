import xmlrpc from "xmlrpc";

const ODOO_URL = process.env.ODOO_URL!;
const ODOO_DB = process.env.ODOO_DB!;
const ODOO_USER = process.env.ODOO_USER!;
const ODOO_API_KEY = process.env.ODOO_API_KEY!;

// UID cache with 1-hour TTL
let cachedUid: { uid: number; ts: number } | null = null;
const UID_TTL = 3600 * 1000;

// In-flight deduplication: multiple parallel calls share one auth request
let pendingUidPromise: Promise<number> | null = null;

function parseUrl(url: string): { host: string; port: number; secure: boolean } {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port) || (u.protocol === "https:" ? 443 : 80),
    secure: u.protocol === "https:",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticate(): Promise<number> {
  const { host, port, secure } = parseUrl(ODOO_URL);
  const clientFactory = secure ? xmlrpc.createSecureClient : xmlrpc.createClient;
  const client = clientFactory({ host, port, path: "/xmlrpc/2/common" });

  return new Promise<number>((resolve, reject) => {
    client.methodCall(
      "authenticate",
      [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}],
      (err: unknown, val: number) => {
        if (err) return reject(err);
        if (!val || typeof val !== "number") {
          return reject(new Error("Authentication failed: invalid credentials"));
        }
        resolve(val);
      }
    );
  });
}

async function getUid(): Promise<number> {
  if (cachedUid && Date.now() - cachedUid.ts < UID_TTL) {
    return cachedUid.uid;
  }

  // Deduplicate: if auth is already in-flight, reuse that promise
  if (pendingUidPromise) {
    return pendingUidPromise;
  }

  pendingUidPromise = (async () => {
    const maxRetries = 3;
    const retryDelays = [500, 1000, 2000];

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const uid = await authenticate();
        cachedUid = { uid, ts: Date.now() };
        return uid;
      } catch (err) {
        if (attempt < maxRetries - 1) {
          await sleep(retryDelays[attempt]);
        } else {
          throw err;
        }
      }
    }
    throw new Error("Authentication failed after retries");
  })().finally(() => {
    pendingUidPromise = null;
  });

  return pendingUidPromise;
}

export async function odooCall<T>(
  model: string,
  method: string,
  args: unknown[],
  kwargs: Record<string, unknown> = {}
): Promise<T> {
  const uid = await getUid();
  const { host, port, secure } = parseUrl(ODOO_URL);
  const clientFactory = secure ? xmlrpc.createSecureClient : xmlrpc.createClient;
  const client = clientFactory({ host, port, path: "/xmlrpc/2/object" });

  return new Promise<T>((resolve, reject) => {
    client.methodCall(
      "execute_kw",
      [ODOO_DB, uid, ODOO_API_KEY, model, method, args, kwargs],
      (err: unknown, val: T) => {
        if (err) return reject(err);
        resolve(val);
      }
    );
  });
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
