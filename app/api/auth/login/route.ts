import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE, createSessionValue } from "@/lib/session";

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

    // Authenticate via JSON-RPC (web session) — no brute-force issues
    const authRes = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { db: ODOO_DB, login: email, password },
      }),
    });

    if (!authRes.ok) {
      return NextResponse.json(
        { error: "Error al conectar con el servidor de autenticación" },
        { status: 502 }
      );
    }

    const authData = await authRes.json() as {
      result?: { uid: number | false; name: string; username: string };
      error?: unknown;
    };

    const uid = authData?.result?.uid;
    if (!uid) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Extract session_id from Set-Cookie header
    const setCookie = authRes.headers.get("set-cookie") ?? "";
    const sessionIdMatch = setCookie.match(/session_id=([^;]+)/);
    const sessionId = sessionIdMatch?.[1] ?? undefined;

    const userName = authData.result?.name ?? email;

    const sessionValue = await createSessionValue({
      uid,
      name: userName,
      email: authData.result?.username ?? email,
      sessionId,
    });

    const response = NextResponse.json({
      success: true,
      user: { uid, name: userName, email: authData.result?.username ?? email },
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
