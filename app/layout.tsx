import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Lato } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
});
const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Time Ledger — Manage Time Like Money",
  description:
    "Track every hour. Sync to Google Sheets. Build insights. Based on Peter Drucker's principles.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⏱</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jetbrains.variable} ${lato.variable}`}
    >
      <body
        className="font-sans antialiased min-h-screen"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
