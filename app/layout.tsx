import type { Metadata } from "next";
import "./globals.css";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/lib/auth/stack";

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
      <body>
        <StackProvider app={stackServerApp}>
          <StackTheme>{children}</StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
