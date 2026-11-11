import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { AppShell } from "@/components/AppShell";
import { THEME_INIT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Plants vs. Keyboard",
  description: "Psaní všemi deseti jako Plants vs. Zombies — Gymnázium Havlíčkův Brod",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        {/* nastaví motiv ještě před vykreslením, aby světlá stránka neproblikla tmavě */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
