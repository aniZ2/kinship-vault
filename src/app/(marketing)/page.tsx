// src/app/(marketing)/page.tsx
import { Metadata } from "next";
import { LandingClient } from "./LandingClient";

export const metadata: Metadata = {
  title: "Kinship Vault - A Private Scrapbook for Your Family's Living Story",
  description:
    "Invite only. No ads. No algorithms. Just memories—photos, voice notes, recipes, and letters—kept safe for the people who matter.",
  keywords: [
    "family scrapbook",
    "private photo sharing",
    "family memories",
    "digital yearbook",
    "family history",
    "memory book",
  ],
  openGraph: {
    title: "Kinship Vault - A Private Scrapbook for Your Family",
    description:
      "Invite only. No ads. No algorithms. Just memories kept safe for the people who matter.",
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
    title: "Kinship Vault - A Private Scrapbook for Your Family",
    description:
      "Invite only. No ads. No algorithms. Just memories kept safe for the people who matter.",
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
                <h1>A private scrapbook for your family&apos;s living story.</h1>
                <p>
                  Invite only. No ads. No algorithms. Just memories—photos, voice notes, recipes,
                  and letters—kept safe for the people who matter.
                </p>
              </div>
            </section>
            <section className="features">
              <div className="wrap features-grid">
                <div className="feature">
                  <h3>Invite-only privacy</h3>
                  <p>Only family members you invite can see or contribute. Your stories stay in the circle.</p>
                </div>
                <div className="feature">
                  <h3>Feels like a scrapbook</h3>
                  <p>Photos, sticky notes, and tape—beautifully imperfect, like real albums passed down.</p>
                </div>
                <div className="feature">
                  <h3>Yearbook you can hold</h3>
                  <p>At year&apos;s end, print a hardcover &quot;Family Yearbook&quot; straight from your scrapbook.</p>
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
