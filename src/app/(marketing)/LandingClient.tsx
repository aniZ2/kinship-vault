// src/app/(marketing)/LandingClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import "@/styles/landing.css";

type AuthState = "loading" | "in" | "out";

export function LandingClient() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const signedIn = authState === "in";

  useEffect(() => {
    if (!auth) {
      setAuthState("out");
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthState(u ? "in" : "out");
    });
    return () => unsub();
  }, []);

  function handleCTA() {
    if (signedIn) {
      router.push("/families");
    } else {
      router.push("/signin");
    }
  }

  return (
    <div className="landing-root">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <header className="landing-header">
        <div className="wrap header-inner">
          <Link href="/" className="brand">
            <div className="brand-mark">KV</div>
            <div className="brand-text">Kinship Vault</div>
          </Link>

          <nav className="nav">
            <Link href="#features" className="nav-link">
              Features
            </Link>
            <Link href="#pricing" className="nav-link">
              Pricing
            </Link>
            <Link href="/how-it-works" className="nav-link">
              How it works
            </Link>
            {authState !== "loading" && (
              signedIn ? (
                <button className="btn" onClick={handleCTA}>
                  Open your vault
                </button>
              ) : (
                <>
                  <Link href="/signin" className="nav-link">
                    Sign in
                  </Link>
                  <button className="btn" onClick={handleCTA}>
                    Get started
                  </button>
                </>
              )
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ================================================================
            HERO
            ================================================================ */}
        <section className="hero">
          <div className="wrap hero-content">
            <h1>The memories that matter shouldn&apos;t live in one person&apos;s phone.</h1>
            <p className="hero-sub">
              Kinship Vault is where families create scrapbooks together — each person adding
              their own pages, their own photos, their own perspective. One book. Everyone&apos;s story.
            </p>

            {authState !== "loading" && (
              <div className="hero-ctas">
                <button className="btn btn-large" onClick={handleCTA}>
                  {signedIn ? "Open your vault" : "Start Your Family's Vault"}
                </button>
                {!signedIn && <span className="cta-note">Free to start</span>}
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            THE PROBLEM
            ================================================================ */}
        <section className="problem">
          <div className="wrap">
            <h2>Someone always carries it alone.</h2>
            <div className="problem-content">
              <p>
                Every family has one. The person who asks everyone for photos after the trip.
                Who spends weekends making the yearbook. Who saves the screenshots, prints
                the albums, keeps the memories alive.
              </p>
              <p>
                Everyone else&apos;s photos stay trapped in their phones. Seen once. Forgotten.
              </p>
              <p>
                And the moments that mattered most — the birthday mornings, the last vacation
                with grandpa, the reunion where four generations stood in one frame — they scatter.
                They fade. They&apos;re gone.
              </p>
              <p className="problem-cta">
                <strong>It doesn&apos;t have to be this way.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            THE SOLUTION
            ================================================================ */}
        <section className="solution">
          <div className="wrap">
            <h2>A scrapbook the whole family builds.</h2>
            <div className="solution-content">
              <p>
                Kinship Vault is a shared space where everyone contributes.
              </p>
              <p>
                Mom adds her pages from the birthday party. Dad adds his. The kids add theirs.
                Grandma sends her favorites and writes a note. Each person&apos;s perspective.
                Each person&apos;s voice. One scrapbook that holds it all.
              </p>
              <p>
                No more chasing photos. No more doing it alone. No more memories lost
                because they never left someone&apos;s camera roll.
              </p>
              <p className="solution-emphasis">
                <strong>When you print it, it&apos;s not &quot;the book mom made.&quot; It&apos;s your family&apos;s book.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            USE CASES
            ================================================================ */}
        <section className="use-cases" id="features">
          <div className="wrap">
            <h2>For the moments that deserve more than a camera roll.</h2>

            <div className="use-cases-grid">
              {/* Use Case 1: Celebration */}
              <div className="use-case">
                <div className="use-case-label">The Celebration</div>
                <h3>Ken&apos;s 6th Birthday</h3>
                <p>
                  Mom captured the cake and the chaos. Dad got the backyard games.
                  Grandma screenshotted her FaceTime call. Ken made a page about his
                  favorite present and his best friend.
                </p>
                <p className="use-case-outcome">
                  Twenty years from now, Ken&apos;s kids will see how a whole family
                  showed up for him that day.
                </p>
              </div>

              {/* Use Case 2: Trip */}
              <div className="use-case">
                <div className="use-case-label">The Trip</div>
                <h3>Three Generations in Costa Rica</h3>
                <p>
                  Grandpa&apos;s quiet sunrise walks. The cousins&apos; beach disasters.
                  Mom&apos;s restaurant discoveries. Dad&apos;s surfing wipeout he swears
                  was &quot;almost perfect.&quot;
                </p>
                <p className="use-case-outcome">
                  Everyone saw the same week differently. Now it lives in one place —
                  not scattered across six phones.
                </p>
              </div>

              {/* Use Case 3: Loss */}
              <div className="use-case">
                <div className="use-case-label">The Loss</div>
                <h3>A Life Book for Dad</h3>
                <p>
                  He&apos;s gone. But his four kids each carry different stories.
                  His wife holds 40 years of moments. The grandkids remember him their own way.
                </p>
                <p className="use-case-outcome">
                  A life book emerges. Not one person&apos;s grief — a family&apos;s portrait
                  of who he was. For the grandchildren who&apos;ll want to know him.
                  For the great-grandchildren who never will.
                </p>
              </div>

              {/* Use Case 4: Reunion */}
              <div className="use-case">
                <div className="use-case-label">The Reunion</div>
                <h3>The Nguyens, Together Again</h3>
                <p>
                  Five years since everyone was in one place. 47 people. Three days.
                  Hundreds of photos that would&apos;ve stayed in hundreds of phones.
                </p>
                <p className="use-case-outcome">
                  A QR code at the entrance. Everyone uploads. The organizers curate.
                  The family gets a book that proves it happened — from every angle.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            HOW IT WORKS
            ================================================================ */}
        <section className="how">
          <div className="wrap">
            <h2>Simple enough for grandma. Powerful enough for you.</h2>

            <div className="steps-grid">
              <div className="step">
                <div className="step-number">1</div>
                <h3>Create your vault</h3>
                <p>Start a family scrapbook in seconds. Invite the people who matter.</p>
              </div>

              <div className="step">
                <div className="step-number">2</div>
                <h3>Everyone adds their pages</h3>
                <p>Each person creates from their perspective. Their photos. Their words. Their design.</p>
              </div>

              <div className="step">
                <div className="step-number">3</div>
                <h3>Collect from anyone</h3>
                <p>Hosting an event? Generate a QR code. Guests upload photos — you approve what makes it in.</p>
              </div>

              <div className="step">
                <div className="step-number">4</div>
                <h3>Print when you&apos;re ready</h3>
                <p>Turn your family&apos;s vault into a beautiful, hardcover book. Or keep adding forever.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            THE EDITOR
            ================================================================ */}
        <section className="editor-section">
          <div className="wrap">
            <h2>Design it exactly how you want.</h2>
            <p className="section-intro">
              This isn&apos;t a template prison. Kinship Vault gives you real creative control:
            </p>

            <ul className="editor-features">
              <li>Drag photos anywhere</li>
              <li>Add text, captions, notes</li>
              <li>Stickers, frames, backgrounds</li>
              <li>Crop, rotate, layer</li>
              <li>Multiple page layouts</li>
              <li>Works on your phone or computer</li>
            </ul>

            <p className="editor-emphasis">
              <strong>If you can imagine it, you can make it.</strong> And when multiple people
              are adding pages, each person&apos;s style makes the book richer.
            </p>
          </div>
        </section>

        {/* ================================================================
            GUEST UPLOADS
            ================================================================ */}
        <section className="guest-uploads">
          <div className="wrap">
            <h2>Every phone at your event. One place for all the photos.</h2>
            <div className="guest-content">
              <p>
                Weddings. Reunions. Milestone birthdays. The best photos are trapped in your guests&apos; phones.
              </p>
              <p>
                Kinship Vault gives you a QR code. Guests scan and upload — no app, no account needed.
                You review everything before it goes in the book.
              </p>
              <p className="guest-emphasis">
                <strong>Their photos. Your curation. Everyone&apos;s memory.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            TRUST / SAFETY
            ================================================================ */}
        <section className="trust">
          <div className="wrap">
            <h2>Private by default. Controlled by you.</h2>

            <div className="trust-grid">
              <div className="trust-item">
                <div className="trust-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3>Invite-only</h3>
                <p>Only people you invite can see or contribute</p>
              </div>

              <div className="trust-item">
                <div className="trust-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                </div>
                <h3>Moderation queue</h3>
                <p>Guest uploads don&apos;t appear until you approve them</p>
              </div>

              <div className="trust-item">
                <div className="trust-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3>Role controls</h3>
                <p>Decide who can edit, who can view, who can invite</p>
              </div>

              <div className="trust-item">
                <div className="trust-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3>No ads. No data selling.</h3>
                <p>Your family&apos;s memories are yours.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            PRICING
            ================================================================ */}
        <section className="pricing" id="pricing">
          <div className="wrap">
            <h2>Start free. Upgrade when you need more.</h2>

            <div className="pricing-grid">
              {/* Free Tier */}
              <div className="pricing-card">
                <div className="pricing-header">
                  <h3>Free</h3>
                  <div className="pricing-amount">
                    <span className="price">$0</span>
                    <span className="period">forever</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>2 family vaults</li>
                  <li>5 members per vault</li>
                  <li>1GB storage</li>
                  <li>Full editor access</li>
                  <li>Pay only when you print</li>
                </ul>
                <p className="pricing-perfect">Perfect for: Making your first family scrapbook</p>
                <button className="btn btn-outline" onClick={handleCTA}>
                  Start Free
                </button>
              </div>

              {/* Family Pro */}
              <div className="pricing-card featured">
                <div className="pricing-badge">Most Popular</div>
                <div className="pricing-header">
                  <h3>Family Pro</h3>
                  <div className="pricing-amount">
                    <span className="price">$199</span>
                    <span className="period">/ year</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>50GB storage</li>
                  <li>Everything in Free</li>
                  <li>Priority support</li>
                </ul>
                <p className="pricing-perfect">Perfect for: Families with years of photos to preserve</p>
                <button className="btn" onClick={handleCTA}>
                  Upgrade to Pro
                </button>
              </div>

              {/* Event Pack */}
              <div className="pricing-card">
                <div className="pricing-header">
                  <h3>Event Pack</h3>
                  <div className="pricing-amount">
                    <span className="price">$299</span>
                    <span className="period">/ year</span>
                  </div>
                </div>
                <ul className="pricing-features">
                  <li>Unlimited storage</li>
                  <li>Unlimited guest uploads via QR</li>
                  <li>Unlimited view-only links</li>
                  <li>5 free printed yearbooks</li>
                  <li>90-day editing windows on renewal</li>
                </ul>
                <p className="pricing-perfect">Perfect for: Weddings, reunions, milestone birthdays</p>
                <button className="btn btn-outline" onClick={handleCTA}>
                  Get Event Pack
                </button>
              </div>
            </div>

            <p className="print-pricing">
              <strong>Print Pricing:</strong> Beautiful hardcover books starting at $12 per book.
              Prices vary by page count and size.{" "}
              <Link href="/how-it-works#print">See Print Options</Link>
            </p>
          </div>
        </section>

        {/* ================================================================
            TESTIMONIALS
            ================================================================ */}
        <section className="testimonials">
          <div className="wrap">
            <div className="testimonials-grid">
              <blockquote className="testimonial">
                <p>
                  &quot;I&apos;ve made our family yearbook alone for six years. This is the first time
                  everyone actually contributed. My mom added pages. My kids added pages.
                  I cried when I saw it finished.&quot;
                </p>
                <cite>— Sarah, mom of 3</cite>
              </blockquote>

              <blockquote className="testimonial">
                <p>
                  &quot;We used the Event Pack for my daughter&apos;s wedding. 200 guests, one QR code,
                  847 photos uploaded. The book is the only wedding gift she displays.&quot;
                </p>
                <cite>— Michael, father of the bride</cite>
              </blockquote>

              <blockquote className="testimonial">
                <p>
                  &quot;After my dad passed, my siblings and I each added our memories.
                  The book sits on my mom&apos;s coffee table. She opens it every day.&quot;
                </p>
                <cite>— Jennifer</cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ================================================================
            FINAL CTA
            ================================================================ */}
        <section className="final-cta">
          <div className="wrap">
            <h2>Your family&apos;s story is being lived right now.</h2>
            <p>
              The birthday party last week. The trip you&apos;re planning. The people who won&apos;t be here forever.
            </p>
            <p>
              These moments deserve more than a camera roll. They deserve a place where everyone
              can add their piece. Where the whole story gets told. Where future generations can
              see who you were and how you loved each other.
            </p>
            <p className="final-emphasis">
              <strong>Start your family&apos;s vault today.</strong>
            </p>
            {authState !== "loading" && (
              <button className="btn btn-large" onClick={handleCTA}>
                {signedIn ? "Open your vault" : "Start Free — No Credit Card Required"}
              </button>
            )}
          </div>
        </section>
      </main>

      {/* ================================================================
          FOOTER
          ================================================================ */}
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
              <Link href="#features">Features</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="/how-it-works#print">Print Options</Link>
              <Link href="/how-it-works">FAQ</Link>
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
