import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frota One | Gestão de Frota",
  description: "Gestão integrada de frota, contratos, manutenção e apropriação.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
