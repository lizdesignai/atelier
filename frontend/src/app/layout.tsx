// src/app/layout.tsx
import { Roboto } from "next/font/google";
import "./globals.css";
import ClientShell from "./ClientShell";

const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

export const metadata = {
  title: "Atelier",
  description: "Gestão Criativa & Operacional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={roboto.variable}>
      <body className="bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] font-roboto h-screen w-screen overflow-hidden flex relative selection:bg-[var(--color-atelier-terracota)] selection:text-white">
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}