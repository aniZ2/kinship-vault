// src/app/(marketing)/page.tsx
import { Metadata } from "next";
import { LandingClient } from "./LandingClient";

export const metadata: Metadata = {
  title: "Kinship Vault - The memories that matter shouldn't live in one person's phone",
  description:
    "Kinship Vault is where families create scrapbooks together — each person adding their own pages, their own photos, their own perspective. One book. Everyone's story.",
  keywords: [
    "family scrapbook",
    "collaborative scrapbook",
    "family memories",
    "digital yearbook",
    "family history",
    "memory book",
    "photo book",
    "family photo sharing",
    "print yearbook",
  ],
  openGraph: {
    title: "Kinship Vault - A scrapbook the whole family builds",
    description:
      "Create scrapbooks together — each person adding their own pages, their own photos, their own perspective. One book. Everyone's story.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kinship Vault - Family Scrapbook",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kinship Vault - A scrapbook the whole family builds",
    description:
      "Create scrapbooks together — each person adding their own pages, their own photos, their own perspective.",
  },
};

// Server component that renders static SEO content
export default function LandingPage() {
  return (
    <>
      {/* Static SEO content rendered on server */}
      <noscript>
        <div className="landing-root">
          <header className="landing-header">
            <div className="wrap header-inner">
              <div className="brand">
                <div className="brand-mark">KV</div>
                <div className="brand-text">Kinship Vault</div>
              </div>
            </div>
          </header>
          <main>
            <section className="hero">
              <div className="wrap">
                <h1>The memories that matter shouldn&apos;t live in one person&apos;s phone.</h1>
                <p>
                  Kinship Vault is where families create scrapbooks together — each person adding
                  their own pages, their own photos, their own perspective. One book. Everyone&apos;s story.
                </p>
              </div>
            </section>
            <section className="features">
              <div className="wrap features-grid">
                <div className="feature">
                  <h3>A scrapbook the whole family builds</h3>
                  <p>Mom adds her pages. Dad adds his. The kids add theirs. One scrapbook that holds it all.</p>
                </div>
                <div className="feature">
                  <h3>Design it exactly how you want</h3>
                  <p>Full creative control — drag photos, add text, stickers, frames. Works on phone or computer.</p>
                </div>
                <div className="feature">
                  <h3>Print when you&apos;re ready</h3>
                  <p>Turn your family&apos;s vault into a beautiful, hardcover book.</p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </noscript>

      {/* Interactive client component */}
      <LandingClient />
    </>
  );
}
