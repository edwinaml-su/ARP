import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avante Reports Platform",
  description: "Panel de control central de los 13 reportes automatizados de Avante",
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
