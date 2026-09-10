import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPINDO Warehouse Analytics Dashboard",
  description: "Real-time Monitoring & Capacity Analytics for Warehouse SPINDO Unit 5 Karawang",
  icons: {
    icon: [
      { url: "/spindo-logo.png", type: "image/png" },
    ],
    shortcut: ["/spindo-logo.png"],
    apple: [
      { url: "/spindo-logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
