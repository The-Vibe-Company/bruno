import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { COOKIE_THEME, lireTheme } from "@/lib/theme";
import "./globals.css";

/** La police des maquettes. Chargée par Next, servie depuis chez nous. */
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Bruno",
  description: "La to-do de The Vibe Company",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = lireTheme((await cookies()).get(COOKIE_THEME)?.value);
  return (
    <html lang="fr" className={`${hanken.variable} h-full`} data-theme={theme === "systeme" ? undefined : theme}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
