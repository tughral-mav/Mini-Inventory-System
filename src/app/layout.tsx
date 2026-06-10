import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Inventory System",
  description: "A simple, production-ready inventory management MVP.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
