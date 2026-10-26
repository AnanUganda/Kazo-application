import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kazo Technical School — Staff Dashboard",
  description: "Staff-only admin dashboard for Kazo Technical School.",
};

// Applies the saved theme before paint to avoid a flash of the wrong theme.
const themeScript = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
