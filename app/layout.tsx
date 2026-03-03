import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/general/theme-provider";
import { CookieConsentBanner } from "@/components/general/CookieConsentBanner";

export const metadata: Metadata = {
  title: "JobVert - Offres d'emploi en aménagement paysager",
  description: "Plateforme de recherche d'emploi dans l'aménagement paysager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
              {children}
              <CookieConsentBanner />
          </ThemeProvider>
      </body>
    </html>
  );
}
