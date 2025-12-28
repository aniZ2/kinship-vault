// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Kinship Vault - A Private Scrapbook for Your Family",
  description:
    "A private, invite-only scrapbook for your family's living story. No ads, no algorithms—just memories kept safe for the people who matter.",
  keywords: ["family", "scrapbook", "memories", "photos", "yearbook", "private"],
  openGraph: {
    title: "Kinship Vault - A Private Scrapbook for Your Family",
    description:
      "A private, invite-only scrapbook for your family's living story. No ads, no algorithms.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts - loaded via link tags to avoid build issues */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
