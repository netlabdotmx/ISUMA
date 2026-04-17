import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, MAX_AGE, createSessionValue } from "@/lib/session";
import { authenticateUser } from "@/lib/odoo";

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

    const user = await authenticateUser(email, password);

    const sessionValue = await createSessionValue({
      uid: user.uid,
      name: user.name,
      email: user.username,
      sessionId: user.sessionId,
    });

    const response = NextResponse.json({
      success: true,
      user: { uid: user.uid, name: user.name, email: user.username },
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
    const msg = error instanceof Error ? error.message : "Error de autenticación";
    console.error("[API /auth/login]", error);

    if (msg === "Credenciales inválidas") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Error al conectar con el servidor de autenticación" },
      { status: 500 }
    );
  }
}
