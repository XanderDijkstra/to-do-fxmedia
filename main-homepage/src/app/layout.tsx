import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fx-media | Home",
  description: "Personal launcher for all your projects and tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
