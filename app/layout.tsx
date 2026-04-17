import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Comercializadora ISUMA | Sunny",
    template: "%s | ISUMA",
  },
  description:
    "Comercializadora ISUMA — Importadores y distribuidores de productos Sunny para mascotas: perros, peces, reptiles y más.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
