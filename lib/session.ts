// lib/session.ts
// Web Crypto API — compatible with Edge (middleware) and Node.js (API routes)

export const COOKIE_NAME = "isuma_session";
export const MAX_AGE = 8 * 60 * 60; // 8 horas en segundos

export interface SessionUser {
  uid: number;
  name: string;
  email: string;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET ?? "isuma-fallback-secret-change-me";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionValue(user: SessionUser): Promise<string> {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const key = await getKey();
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  const sig = Buffer.from(sigBuffer).toString("hex");
  return `${payload}.${sig}`;
}

export async function parseSession(value: string): Promise<SessionUser | null> {
  try {
    const dotIdx = value.lastIndexOf(".");
    if (dotIdx === -1) return null;
    const payload = value.slice(0, dotIdx);
    const sigHex = value.slice(dotIdx + 1);
    const key = await getKey();
    const sigBytes = Buffer.from(sigHex, "hex");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionUser;
  } catch {
    return null;
  }
}
