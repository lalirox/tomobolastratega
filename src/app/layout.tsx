import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@fontsource/rye";
import "@fontsource/smokum";
import "@fontsource/special-elite";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Tómbola del Viejo Oeste · Control Remoto",
  description:
    "Tómbola con 100 números y estética del viejo oeste. Escanea el código QR para convertir tu celular en el control remoto: presiona el botón rojo, cuenta atrás de 5 a 0 y la tómbola canta un número.",
  keywords: ["tómbola", "bingo", "rifas", "viejo oeste", "control remoto", "QR"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#241608",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
