import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Upbase B2C — Marketing Operations Hub",
  description: "Enterprise Digital Workspace for Upbase B2C Marketing — Supabase, Prisma & Next.js on Vercel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#f8fafc] text-[#0f172a] flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
