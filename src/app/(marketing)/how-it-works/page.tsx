// src/app/(marketing)/how-it-works/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import "@/styles/landing.css";
import "@/styles/how-it-works.css";

export const metadata: Metadata = {
  title: "How It Works - Kinship Vault",
  description:
    "Learn how Kinship Vault helps families create collaborative scrapbooks. Everyone adds their own pages. Print beautiful hardcover books.",
  openGraph: {
    title: "How It Works - Kinship Vault",
    description:
      "Learn how Kinship Vault helps families create collaborative scrapbooks together.",
    type: "website",
  },
};

export default function HowItWorksPage() {
  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="wrap header-inner">
          <Link href="/" className="brand">
            <div className="brand-mark">KV</div>
            <div className="brand-text">Kinship Vault</div>
          </Link>

          <nav className="nav">
            <Link href="/#features" className="nav-link">
              Features
            </Link>
            <Link href="/#pricing" className="nav-link">
              Pricing
            </Link>
            <Link href="/how-it-works" className="nav-link active">
              How it works
            </Link>
            <Link href="/signin" className="nav-link">
              Sign in
            </Link>
            <Link href="/signin" className="btn">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hiw-hero">
          <div className="wrap">
            <h1>How Kinship Vault Works</h1>
            <p className="hiw-subtitle">
              A shared space where your whole family creates scrapbooks together.
              Each person adds their own pages. One book holds everyone&apos;s story.
            </p>
          </div>
        </section>

        {/* The Big Picture */}
        <section className="hiw-section">
          <div className="wrap">
            <div className="hiw-intro">
              <h2>The Big Picture</h2>
              <p>
                No more chasing photos after every event. No more one person doing all the work.
                Kinship Vault gives your family one private place where everyone contributes
                their own memories and perspectives.
              </p>
            </div>

            <div className="hiw-flow">
              <div className="hiw-flow-step">
                <div className="hiw-flow-icon">1</div>
                <h3>Create Your Vault</h3>
                <p>Start a family scrapbook in seconds. You become the owner with full control.</p>
              </div>
              <div className="hiw-flow-arrow">
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M0 12h36M28 4l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-icon">2</div>
                <h3>Invite Your Family</h3>
                <p>Share an invite code with the people who matter. Everyone can add pages.</p>
              </div>
              <div className="hiw-flow-arrow">
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M0 12h36M28 4l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-icon">3</div>
                <h3>Everyone Contributes</h3>
                <p>Each person creates from their perspective. Their photos. Their words. Their design.</p>
              </div>
              <div className="hiw-flow-arrow">
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M0 12h36M28 4l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-icon">4</div>
                <h3>Print When Ready</h3>
                <p>Turn your vault into a beautiful hardcover book. Or keep adding forever.</p>
              </div>
            </div>
          </div>
        </section>

        {/* The Editor */}
        <section className="hiw-section hiw-alt">
          <div className="wrap">
            <div className="hiw-split">
              <div className="hiw-split-content">
                <span className="hiw-label">The Editor</span>
                <h2>Design Pages Your Way</h2>
                <p>
                  This isn&apos;t a template prison. Our canvas editor gives you real creative control —
                  like crafting with paper, tape, and scissors, but digital.
                </p>
                <ul className="hiw-list">
                  <li>
                    <span className="hiw-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                    <span><strong>Photos</strong> — Drag anywhere, crop, rotate, add frames and shapes</span>
                  </li>
                  <li>
                    <span className="hiw-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                    <span><strong>Text</strong> — Multiple fonts, colors, captions, and notes</span>
                  </li>
                  <li>
                    <span className="hiw-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                    <span><strong>Stickers &amp; Tape</strong> — Decorative elements that feel handmade</span>
                  </li>
                  <li>
                    <span className="hiw-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                    <span><strong>Backgrounds</strong> — Colors, patterns, or upload your own</span>
                  </li>
                  <li>
                    <span className="hiw-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                    <span><strong>Works Everywhere</strong> — Phone, tablet, or computer</span>
                  </li>
                </ul>
              </div>
              <div className="hiw-split-visual">
                <div className="hiw-editor-preview">
                  <div className="hiw-editor-toolbar">
                    <span></span><span></span><span></span>
                  </div>
                  <div className="hiw-editor-canvas">
                    <div className="hiw-mock-photo" style={{ top: '20%', left: '10%', transform: 'rotate(-3deg)' }}>
                      <div className="hiw-mock-img"></div>
                    </div>
                    <div className="hiw-mock-photo" style={{ top: '30%', right: '15%', transform: 'rotate(4deg)' }}>
                      <div className="hiw-mock-img"></div>
                    </div>
                    <div className="hiw-mock-text" style={{ bottom: '20%', left: '25%' }}>
                      Summer 2024
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Family Roles */}
        <section className="hiw-section">
          <div className="wrap">
            <div className="hiw-intro">
              <span className="hiw-label">Family Roles</span>
              <h2>Everyone Has a Part to Play</h2>
              <p>
                Different family members can have different levels of access, from full editing
                to view-only.
              </p>
            </div>

            <div className="hiw-roles-grid">
              <div className="hiw-role-card">
                <div className="hiw-role-icon owner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <h3>Owner</h3>
                <p>Full control. Manages billing, can delete the family, and transfer ownership.</p>
                <ul>
                  <li>Create &amp; edit all pages</li>
                  <li>Invite &amp; remove members</li>
                  <li>Manage subscription</li>
                </ul>
              </div>

              <div className="hiw-role-card">
                <div className="hiw-role-icon admin">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                  </svg>
                </div>
                <h3>Admin</h3>
                <p>Trusted family members who help manage the scrapbook.</p>
                <ul>
                  <li>Create &amp; edit all pages</li>
                  <li>Invite new members</li>
                  <li>Moderate guest uploads</li>
                </ul>
              </div>

              <div className="hiw-role-card">
                <div className="hiw-role-icon member">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <h3>Member</h3>
                <p>Regular family contributors who add to the story.</p>
                <ul>
                  <li>Create new pages</li>
                  <li>Edit their own pages</li>
                  <li>View everything</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Event Pack / Guest Uploads */}
        <section className="hiw-section hiw-alt hiw-event">
          <div className="wrap">
            <div className="hiw-intro">
              <span className="hiw-label hiw-label-accent">Guest Uploads</span>
              <h2>Every Phone at Your Event. One Place for All the Photos.</h2>
              <p>
                Weddings. Reunions. Milestone birthdays. The best photos are trapped in your guests&apos; phones.
                Kinship Vault gives you a QR code — guests scan and upload, no app needed.
              </p>
            </div>

            <div className="hiw-event-flow">
              <div className="hiw-event-step">
                <div className="hiw-event-num">1</div>
                <div className="hiw-event-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <h4>Generate QR Code</h4>
                <p>Print on table cards or display at the venue</p>
              </div>

              <div className="hiw-event-step">
                <div className="hiw-event-num">2</div>
                <div className="hiw-event-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
                <h4>Guests Upload</h4>
                <p>Scan, snap, submit — no account needed</p>
              </div>

              <div className="hiw-event-step">
                <div className="hiw-event-num">3</div>
                <div className="hiw-event-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                </div>
                <h4>You Moderate</h4>
                <p>Approve the best shots, reject the blurry ones</p>
              </div>

              <div className="hiw-event-step">
                <div className="hiw-event-num">4</div>
                <div className="hiw-event-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <h4>Add to Book</h4>
                <p>The best photos become pages in your scrapbook</p>
              </div>
            </div>

            <div className="hiw-event-tiers">
              <h3>Their Photos. Your Curation. Everyone&apos;s Memory.</h3>
              <div className="hiw-tiers-table">
                <div className="hiw-tier-row hiw-tier-header">
                  <div>Role</div>
                  <div>Who</div>
                  <div>Access</div>
                </div>
                <div className="hiw-tier-row">
                  <div><strong>Editors</strong></div>
                  <div>5 trusted people (bride, groom, parents)</div>
                  <div>Full edit access</div>
                </div>
                <div className="hiw-tier-row">
                  <div><strong>Guest Uploaders</strong></div>
                  <div>Unlimited (all event guests)</div>
                  <div>Upload via QR only</div>
                </div>
                <div className="hiw-tier-row">
                  <div><strong>Guest Viewers</strong></div>
                  <div>Anyone with view link</div>
                  <div>View-only access</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Print Options */}
        <section className="hiw-section" id="print">
          <div className="wrap">
            <div className="hiw-intro">
              <span className="hiw-label">Print Options</span>
              <h2>Beautiful Books You Can Hold</h2>
              <p>
                When you&apos;re ready, turn your digital scrapbook into a beautiful hardcover book.
                Professional quality printing, delivered to your door.
              </p>
            </div>

            <div className="hiw-print-grid">
              <div className="hiw-print-card">
                <h3>Standard Hardcover</h3>
                <p className="hiw-print-size">8&quot; × 8&quot;</p>
                <p className="hiw-print-price">Starting at $12</p>
                <ul>
                  <li>Premium matte cover</li>
                  <li>Thick 100lb pages</li>
                  <li>Lay-flat binding</li>
                </ul>
              </div>

              <div className="hiw-print-card hiw-print-featured">
                <div className="hiw-print-badge">Most Popular</div>
                <h3>Large Hardcover</h3>
                <p className="hiw-print-size">10&quot; × 10&quot;</p>
                <p className="hiw-print-price">Starting at $18</p>
                <ul>
                  <li>Premium matte cover</li>
                  <li>Thick 100lb pages</li>
                  <li>Lay-flat binding</li>
                </ul>
              </div>

              <div className="hiw-print-card">
                <h3>Portrait Hardcover</h3>
                <p className="hiw-print-size">8.5&quot; × 11&quot;</p>
                <p className="hiw-print-price">Starting at $15</p>
                <ul>
                  <li>Premium matte cover</li>
                  <li>Thick 100lb pages</li>
                  <li>Lay-flat binding</li>
                </ul>
              </div>
            </div>

            <p className="hiw-print-note">
              Pricing varies by page count. Additional pages ~$0.50 each. Shipping calculated at checkout.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="hiw-section hiw-alt">
          <div className="wrap">
            <div className="hiw-intro">
              <span className="hiw-label">Pricing</span>
              <h2>Start Free. Upgrade When You Need More.</h2>
              <p>No credit card required to start. Print costs are separate.</p>
            </div>

            <div className="hiw-pricing-grid-new">
              <div className="hiw-pricing-card">
                <h3>Free</h3>
                <div className="hiw-price">$0<span>/forever</span></div>
                <p className="hiw-price-desc">Perfect for your first family scrapbook</p>
                <ul>
                  <li>2 family vaults</li>
                  <li>5 members per vault</li>
                  <li>1GB storage</li>
                  <li>Full editor access</li>
                  <li>Pay only when you print</li>
                </ul>
              </div>

              <div className="hiw-pricing-card hiw-pricing-featured">
                <div className="hiw-pricing-badge">Most Popular</div>
                <h3>Family Pro</h3>
                <div className="hiw-price">$199<span>/year</span></div>
                <p className="hiw-price-desc">For families with years of memories</p>
                <ul>
                  <li>50GB storage</li>
                  <li>Everything in Free</li>
                  <li>Priority support</li>
                </ul>
              </div>

              <div className="hiw-pricing-card">
                <h3>Event Pack</h3>
                <div className="hiw-price">$299<span>/year</span></div>
                <p className="hiw-price-desc">Weddings, reunions, milestone birthdays</p>
                <ul>
                  <li>Unlimited storage</li>
                  <li>Unlimited guest uploads via QR</li>
                  <li>Unlimited view-only links</li>
                  <li>5 free printed yearbooks</li>
                  <li>90-day editing windows</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="hiw-section" id="faq">
          <div className="wrap">
            <div className="hiw-intro">
              <span className="hiw-label">FAQ</span>
              <h2>Common Questions</h2>
            </div>

            <div className="hiw-faq-list">
              <details className="hiw-faq-item">
                <summary>How is this different from a shared Google Photos album?</summary>
                <p>
                  Google Photos is great for storing photos, but it&apos;s not a scrapbook. Kinship Vault
                  lets each family member design their own pages — adding text, stickers, backgrounds,
                  and layouts. It&apos;s about creating, not just dumping photos.
                </p>
              </details>

              <details className="hiw-faq-item">
                <summary>Can grandparents really use this?</summary>
                <p>
                  Yes! Our editor is designed to be intuitive. Drag photos, tap to add text,
                  choose a background. If they can use Facebook, they can use Kinship Vault.
                  And we&apos;re always here to help.
                </p>
              </details>

              <details className="hiw-faq-item">
                <summary>What happens to my photos if I cancel?</summary>
                <p>
                  You can download all your content at any time. If you cancel a paid plan,
                  you keep access to everything in your free tier limits. We never delete
                  your photos without warning.
                </p>
              </details>

              <details className="hiw-faq-item">
                <summary>How long does printing take?</summary>
                <p>
                  Books typically ship within 5-7 business days. Delivery time depends on your
                  location — usually 3-7 additional days for US addresses.
                </p>
              </details>

              <details className="hiw-faq-item">
                <summary>Can I order multiple copies of a book?</summary>
                <p>
                  Absolutely! Perfect for grandparents, aunts, uncles, or anyone who wants their
                  own copy. Each additional copy is discounted.
                </p>
              </details>

              <details className="hiw-faq-item">
                <summary>Is my family&apos;s content private?</summary>
                <p>
                  Completely. Only people you explicitly invite can see your vault. We don&apos;t
                  use your photos for advertising or AI training. Your memories are yours.
                </p>
              </details>

              <details className="hiw-faq-item">
                <summary>What if I need help?</summary>
                <p>
                  Email us at <a href="mailto:support@kinshipvault.com">support@kinshipvault.com</a>.
                  We typically respond within 24 hours and we genuinely care about helping families
                  preserve their stories.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="hiw-section hiw-cta">
          <div className="wrap">
            <h2>Ready to Start Your Family&apos;s Story?</h2>
            <p>Create your vault in 30 seconds. No credit card required.</p>
            <div className="hiw-cta-buttons">
              <Link href="/signin" className="btn">
                Start Your Family&apos;s Vault
              </Link>
              <Link href="/" className="btn ghost">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <div className="brand">
              <div className="brand-mark">KV</div>
              <div className="brand-text">Kinship Vault</div>
            </div>
            <p className="footer-tagline">Your family&apos;s story — told by everyone who lived it.</p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-column">
              <h4>Product</h4>
              <Link href="/#features">Features</Link>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/how-it-works#print">Print Options</Link>
              <Link href="/how-it-works#faq">FAQ</Link>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a href="mailto:hello@kinshipvault.com">Contact</a>
            </div>
          </div>
        </div>

        <div className="wrap footer-bottom">
          <p>&copy; {new Date().getFullYear()} Osifo Holdings L.L.C.</p>
        </div>
      </footer>
    </div>
  );
}
