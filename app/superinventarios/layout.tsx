import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/AppShell";
import { COOKIE_NAME, parseSession } from "@/lib/session";

export const metadata: Metadata = {
  title: {
    default: "SuperInventarios | ISUMA",
    template: "%s | SuperInventarios ISUMA",
  },
};

export default async function SuperInventariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(COOKIE_NAME)?.value;
  const user = sessionValue ? await parseSession(sessionValue) : null;

  return (
    <AppShell userName={user?.name} userEmail={user?.email}>
      {children}
    </AppShell>
  );
}
