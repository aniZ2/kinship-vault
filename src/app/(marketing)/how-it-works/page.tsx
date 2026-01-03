// src/app/(marketing)/how-it-works/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import "@/styles/landing.css";
import "@/styles/how-it-works.css";

export const metadata: Metadata = {
  title: "How It Works - Kinship Vault",
  description:
    "Learn how Kinship Vault helps families create collaborative digital scrapbooks. Create your family space, invite members, and preserve memories together.",
  openGraph: {
    title: "How It Works - Kinship Vault",
    description:
      "Learn how Kinship Vault helps families create collaborative digital scrapbooks.",
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
              A private space for your family to collect, create, and preserve memories together.
            </p>
          </div>
        </section>

        {/* The Big Picture */}
        <section className="hiw-section">
          <div className="wrap">
            <div className="hiw-intro">
              <h2>The Big Picture</h2>
              <p>
                Kinship Vault is a collaborative family scrapbook. Instead of photos scattered
                across phones and cloud drives, your family has one private place where everyone
                can contribute memories and create beautiful pages together.
              </p>
            </div>

            <div className="hiw-flow">
              <div className="hiw-flow-step">
                <div className="hiw-flow-icon">1</div>
                <h3>Create Your Family Space</h3>
                <p>Sign up and create a family vault. You become the owner with full control.</p>
              </div>
              <div className="hiw-flow-arrow">
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M0 12h36M28 4l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-icon">2</div>
                <h3>Invite Your Family</h3>
                <p>Share an invite code with up to 5 family members who can edit and create.</p>
              </div>
              <div className="hiw-flow-arrow">
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path d="M0 12h36M28 4l8 8-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-icon">3</div>
                <h3>Create Together</h3>
                <p>Add photos, write captions, decorate pages with stickers and washi tape.</p>
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
                <h2>Design Pages Like a Real Scrapbook</h2>
                <p>
                  Our canvas editor feels like crafting with paper, tape, and scissors—but digital.
                  Drag photos anywhere, rotate them, add frames, and layer stickers on top.
                </p>
                <ul className="hiw-list">
                  <li>
                    <span className="hiw-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                    <span><strong>Photos</strong> — Frames, shapes (heart, circle, star), shadows, borders</span>
                  </li>
                  <li>
                    <span className="hiw-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                    <span><strong>Text</strong> — 12 fonts, colors, effects like neon and retro</span>
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

        {/* Event Pack */}
        <section className="hiw-section hiw-alt hiw-event">
          <div className="wrap">
            <div className="hiw-intro">
              <span className="hiw-label hiw-label-accent">Event Pack</span>
              <h2>Perfect for Weddings &amp; Reunions</h2>
              <p>
                Hosting a big event? The Event Pack lets unlimited guests upload photos via QR code—no
                app download needed. You curate, they contribute.
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
                <p>Print it on table cards or display at the venue</p>
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
                <p>Scan, snap, submit—no account needed</p>
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <h4>Guests View</h4>
                <p>Approved guests get a view-only link to revisit</p>
              </div>
            </div>

            <div className="hiw-event-tiers">
              <h3>Who Can Do What</h3>
              <div className="hiw-tiers-table">
                <div className="hiw-tier-row hiw-tier-header">
                  <div>Role</div>
                  <div>Who</div>
                  <div>Access</div>
                </div>
                <div className="hiw-tier-row">
                  <div><strong>Editors</strong></div>
                  <div>5 trusted people (e.g., bride, groom, parents)</div>
                  <div>Full edit access</div>
                </div>
                <div className="hiw-tier-row">
                  <div><strong>Guest Uploaders</strong></div>
                  <div>Unlimited (all your event guests)</div>
                  <div>Upload only via QR</div>
                </div>
                <div className="hiw-tier-row">
                  <div><strong>Guest Viewers</strong></div>
                  <div>Everyone who uploaded</div>
                  <div>View-only link</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="hiw-section">
          <div className="wrap">
            <div className="hiw-intro">
              <span className="hiw-label">Pricing</span>
              <h2>Simple Plans for Every Family</h2>
              <p>Start free, upgrade when you need more space or features.</p>
            </div>

            <div className="hiw-pricing-grid">
              <div className="hiw-pricing-card">
                <h3>Free</h3>
                <div className="hiw-price">$0</div>
                <p className="hiw-price-desc">Perfect for trying it out</p>
                <ul>
                  <li>Join up to 2 families</li>
                  <li>5 members per family</li>
                  <li>1 GB storage</li>
                </ul>
              </div>

              <div className="hiw-pricing-card">
                <h3>User Pro</h3>
                <div className="hiw-price">$49<span>/year</span></div>
                <p className="hiw-price-desc">For the family connector</p>
                <ul>
                  <li>Join up to 5 families</li>
                  <li>Great for in-laws, cousins</li>
                  <li>1 GB storage per family</li>
                </ul>
              </div>

              <div className="hiw-pricing-card">
                <h3>Family Pro</h3>
                <div className="hiw-price">$199<span>/year</span></div>
                <p className="hiw-price-desc">For ongoing scrapbooking</p>
                <ul>
                  <li>Generous storage</li>
                  <li>5 members</li>
                  <li>Limited guest uploads</li>
                </ul>
              </div>

              <div className="hiw-pricing-card hiw-pricing-featured">
                <div className="hiw-pricing-badge">Best for Events</div>
                <h3>Event Pack</h3>
                <div className="hiw-price">$299<span>/year</span></div>
                <p className="hiw-price-desc">Weddings, reunions, parties</p>
                <ul>
                  <li>Unlimited storage</li>
                  <li>Unlimited guest uploads</li>
                  <li>Unlimited view links</li>
                  <li>5 free printed yearbooks</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="hiw-section hiw-cta">
          <div className="wrap">
            <h2>Ready to Start Your Family Story?</h2>
            <p>Create your vault in 30 seconds. No credit card required.</p>
            <div className="hiw-cta-buttons">
              <Link href="/signin" className="btn">
                Create your family space
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
          <div>&copy; {new Date().getFullYear()} Kinship Vault</div>
          <div className="footer-links">
            <Link href="/how-it-works">How it works</Link>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
