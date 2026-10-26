import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kazo Technical School — Staff Dashboard",
  description: "Staff-only admin dashboard for Kazo Technical School.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
