// src/app/(marketing)/privacy/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import "@/styles/legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy - Kinship Vault",
  description: "Learn how Kinship Vault protects your family's privacy and handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <div className="wrap">
          <Link href="/" className="brand">
            <div className="brand-mark">KV</div>
            <div className="brand-text">Kinship Vault</div>
          </Link>
        </div>
      </header>

      <main className="legal-main">
        <div className="wrap">
          <h1>Privacy Policy</h1>
          <p className="effective-date">Effective Date: January 1, 2026</p>

          <section>
            <h2>Introduction</h2>
            <p>
              Kinship Vault (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting the privacy
              of your family&apos;s memories. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our service.
            </p>
            <p>
              We believe your family&apos;s stories belong to you — not to advertisers, data brokers,
              or algorithms. This policy reflects that belief.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>

            <h3>Information You Provide</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, and password when you create an account</li>
              <li><strong>Family Content:</strong> Photos, text, notes, and other content you add to your family scrapbooks</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we do not store full card numbers)</li>
              <li><strong>Communications:</strong> Messages you send us for support or feedback</li>
            </ul>

            <h3>Information Collected Automatically</h3>
            <ul>
              <li><strong>Usage Data:</strong> How you interact with the service (pages visited, features used)</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, error logs</li>
            </ul>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide, maintain, and improve Kinship Vault</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Detect, prevent, and address technical issues and abuse</li>
              <li>Generate printed books when you order them</li>
            </ul>
            <p><strong>We do not:</strong></p>
            <ul>
              <li>Sell your personal information to third parties</li>
              <li>Use your photos to train AI models</li>
              <li>Show you targeted advertising based on your content</li>
              <li>Share your family&apos;s content with anyone you haven&apos;t invited</li>
            </ul>
          </section>

          <section>
            <h2>How We Share Your Information</h2>
            <p>We share your information only in these circumstances:</p>
            <ul>
              <li><strong>With Your Consent:</strong> When you invite family members, they can see shared content</li>
              <li><strong>Service Providers:</strong> Companies that help us operate (cloud hosting, payment processing, print fulfillment)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice to you)</li>
            </ul>
          </section>

          <section>
            <h2>Data Storage and Security</h2>
            <p>
              Your data is stored on secure servers provided by Google Cloud Platform and Cloudflare.
              We implement industry-standard security measures including:
            </p>
            <ul>
              <li>Encryption in transit (TLS/HTTPS)</li>
              <li>Encryption at rest for stored data</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
            </ul>
            <p>
              While we strive to protect your information, no method of transmission over the internet
              is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your content in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from promotional emails</li>
            </ul>
            <p>
              To exercise these rights, contact us at{" "}
              <a href="mailto:privacy@kinshipvault.com">privacy@kinshipvault.com</a>.
            </p>
          </section>

          <section>
            <h2>Children&apos;s Privacy</h2>
            <p>
              Kinship Vault is designed for families, which may include content about children.
              However, our service is intended for users 13 years and older. We do not knowingly
              collect personal information from children under 13 without parental consent.
            </p>
            <p>
              Parents and guardians who believe we have collected information from a child under 13
              should contact us immediately at{" "}
              <a href="mailto:privacy@kinshipvault.com">privacy@kinshipvault.com</a>.
            </p>
          </section>

          <section>
            <h2>Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide
              services. If you delete your account, we will delete your personal data within 30 days,
              except where retention is required by law.
            </p>
            <p>
              Printed books you order contain copies of your content and are shipped to you directly.
              We do not retain copies after printing is complete.
            </p>
          </section>

          <section>
            <h2>International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place to protect your data in accordance with
              this Privacy Policy.
            </p>
          </section>

          <section>
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new policy on this page and updating the &quot;Effective Date.&quot;
              Material changes will be communicated via email or in-app notification.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <ul className="contact-list">
              <li>Email: <a href="mailto:privacy@kinshipvault.com">privacy@kinshipvault.com</a></li>
              <li>Mail: Osifo Holdings L.L.C., [Address to be added]</li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="legal-footer">
        <div className="wrap">
          <p>&copy; {new Date().getFullYear()} Osifo Holdings L.L.C. All rights reserved.</p>
          <div className="legal-links">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
