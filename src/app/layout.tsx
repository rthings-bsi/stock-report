import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPINDO Warehouse Analytics Dashboard",
  description: "Real-time Monitoring & Capacity Analytics for Warehouse SPINDO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
