import { NextRequest, NextResponse } from "next/server";
import xmlrpc from "xmlrpc";
import { COOKIE_NAME, MAX_AGE, createSessionValue } from "@/lib/session";

function parseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port) || (u.protocol === "https:" ? 443 : 80),
    secure: u.protocol === "https:",
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json() as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña requeridos" },
        { status: 400 }
      );
    }

    const ODOO_URL = process.env.ODOO_URL!;
    const ODOO_DB = process.env.ODOO_DB!;

    const { host, port, secure } = parseUrl(ODOO_URL);
    const clientFactory = secure
      ? xmlrpc.createSecureClient
      : xmlrpc.createClient;
    const commonClient = clientFactory({ host, port, path: "/xmlrpc/2/common" });

    // Authenticate the user against Odoo with their own credentials
    const uid = await new Promise<number | false>((resolve, reject) => {
      commonClient.methodCall(
        "authenticate",
        [ODOO_DB, email, password, {}],
        (err: unknown, val: number | false) => {
          if (err) return reject(err);
          resolve(val);
        }
      );
    });

    if (!uid) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Get user display name from Odoo
    const ODOO_API_KEY = process.env.ODOO_API_KEY!;
    const objectClient = clientFactory({ host, port, path: "/xmlrpc/2/object" });

    const users = await new Promise<{ id: number; name: string; login: string }[]>(
      (resolve, reject) => {
        objectClient.methodCall(
          "execute_kw",
          [
            ODOO_DB,
            uid,
            password, // use the user's own password here for their own record
            "res.users",
            "search_read",
            [[["id", "=", uid]]],
            { fields: ["id", "name", "login"] },
          ],
          (err: unknown, val: { id: number; name: string; login: string }[]) => {
            if (err) return reject(err);
            resolve(val);
          }
        );
      }
    );

    // Fallback to email if name fetch fails
    const userName = users[0]?.name ?? email;

    // Create signed session
    const sessionValue = await createSessionValue({
      uid,
      name: userName,
      email: users[0]?.login ?? email,
    });

    const response = NextResponse.json({
      success: true,
      user: { uid, name: userName, email: users[0]?.login ?? email },
    });

    response.cookies.set(COOKIE_NAME, sessionValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[API /auth/login]", error);
    return NextResponse.json(
      { error: "Error al conectar con el servidor de autenticación" },
      { status: 500 }
    );
  }
}
