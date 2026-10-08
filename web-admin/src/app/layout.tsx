import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Upbase Ops",
  description: "Công cụ vận hành Marketing B2C của Upbase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`h-full ${beVietnam.variable} ${jetbrains.variable}`}>
      <body className="min-h-full bg-canvas text-ink flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
