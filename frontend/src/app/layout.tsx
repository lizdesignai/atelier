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
  title: "Atelier — Studio Veronna",
  description: "Studio de Construção & Gestão de Marcas",
  icons: {
    icon: [
      { url: "/images/Ativo 5.svg", media: "(prefers-color-scheme: light)", type: "image/svg+xml" },
      { url: "/images/Ativo 2.svg", media: "(prefers-color-scheme: dark)", type: "image/svg+xml" },
      { url: "/images/Ativo 2.svg", type: "image/svg+xml" }
    ],
    shortcut: "/images/Ativo 2.svg",
    apple: "/images/Ativo 2.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={roboto.variable} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link id="dynamic-favicon" rel="icon" href="/images/Ativo 2.svg" type="image/svg+xml" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('veronna_theme') || localStorage.getItem('atelier_theme');
                  if (!t) {
                    t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', t);
                  if (t === 'veronna') {
                    document.documentElement.classList.add('theme-veronna');
                  } else if (t === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.add('light');
                  }
                  var favicon = document.getElementById('dynamic-favicon');
                  if (favicon) {
                    favicon.href = (t === 'light') ? '/images/Ativo 5.svg' : '/images/Ativo 2.svg';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[var(--color-atelier-creme)] text-[var(--color-atelier-grafite)] font-roboto h-[100dvh] w-screen overflow-hidden flex relative selection:bg-[var(--color-veronna-navy)] selection:text-[var(--color-veronna-pedra)] transition-colors duration-500">
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}