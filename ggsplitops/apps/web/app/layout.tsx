import type { Metadata, Viewport } from "next";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ggsplitops — shared expenses, settled",
  description:
    "Open-source collaborative expense platform with exact money arithmetic, debt simplification, and INR (₹) support. Mobile-first.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e0d" },
    { media: "(prefers-color-scheme: light)", color: "#f8faf9" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
