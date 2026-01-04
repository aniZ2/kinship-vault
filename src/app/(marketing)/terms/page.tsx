// src/app/(marketing)/terms/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import "@/styles/legal.css";

export const metadata: Metadata = {
  title: "Terms of Service - Kinship Vault",
  description: "Terms of Service for using Kinship Vault, the family scrapbook platform.",
};

export default function TermsPage() {
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
          <h1>Terms of Service</h1>
          <p className="effective-date">Effective Date: January 1, 2026</p>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Kinship Vault (&quot;Service&quot;), operated by Osifo Holdings L.L.C.
              (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service.
            </p>
            <p>
              We may modify these Terms at any time. Continued use of the Service after changes
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              Kinship Vault is a collaborative family scrapbook platform that allows users to:
            </p>
            <ul>
              <li>Create and manage family scrapbooks</li>
              <li>Invite family members to contribute content</li>
              <li>Collect photos from event guests via QR codes</li>
              <li>Design scrapbook pages with photos, text, and decorations</li>
              <li>Order printed hardcover books</li>
            </ul>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <p>To use Kinship Vault, you must:</p>
            <ul>
              <li>Be at least 13 years old (or the minimum age in your jurisdiction)</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
            </ul>
            <p>
              You are responsible for all activity under your account. Notify us immediately
              at <a href="mailto:security@kinshipvault.com">security@kinshipvault.com</a> if
              you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2>4. User Content</h2>

            <h3>Your Content</h3>
            <p>
              You retain ownership of all content you upload (&quot;User Content&quot;), including photos,
              text, and other materials. By uploading content, you grant us a limited license to:
            </p>
            <ul>
              <li>Store and display your content to you and those you invite</li>
              <li>Process your content to generate printed books</li>
              <li>Create backups for data protection</li>
            </ul>
            <p>
              This license ends when you delete your content or account, except for content
              already included in printed books or shared with others.
            </p>

            <h3>Content Responsibilities</h3>
            <p>You agree not to upload content that:</p>
            <ul>
              <li>Infringes intellectual property rights of others</li>
              <li>Contains illegal material or promotes illegal activity</li>
              <li>Is defamatory, harassing, or threatening</li>
              <li>Contains malware or harmful code</li>
              <li>Violates the privacy rights of others without consent</li>
              <li>Contains explicit adult content</li>
            </ul>
            <p>
              We reserve the right to remove content that violates these Terms and to suspend
              or terminate accounts of repeat violators.
            </p>
          </section>

          <section>
            <h2>5. Family Vaults and Sharing</h2>
            <p>
              When you create a family vault and invite members:
            </p>
            <ul>
              <li>You are responsible for managing access to your vault</li>
              <li>Invited members can view and contribute content based on their permissions</li>
              <li>Vault owners can remove members and their contributions</li>
              <li>Content shared in a vault may be visible to all vault members</li>
            </ul>
            <p>
              We are not responsible for how invited members use or share content they access
              through your vault.
            </p>
          </section>

          <section>
            <h2>6. Guest Uploads</h2>
            <p>
              When you generate a QR code for guest uploads:
            </p>
            <ul>
              <li>You are responsible for moderating uploaded content</li>
              <li>Guests upload content subject to these Terms</li>
              <li>You may approve or reject guest submissions</li>
              <li>Approved content becomes part of your vault</li>
            </ul>
          </section>

          <section>
            <h2>7. Subscriptions and Payments</h2>

            <h3>Free Tier</h3>
            <p>
              The free tier includes limited storage and features as described on our pricing page.
              We may modify free tier limits with notice.
            </p>

            <h3>Paid Subscriptions</h3>
            <ul>
              <li>Subscriptions are billed annually in advance</li>
              <li>Payments are processed securely through Stripe</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
              <li>Refunds are provided in accordance with our refund policy</li>
            </ul>

            <h3>Printed Books</h3>
            <ul>
              <li>Book orders are processed by our print partner (Lulu)</li>
              <li>Pricing varies by book size and page count</li>
              <li>Shipping costs are calculated at checkout</li>
              <li>Orders cannot be cancelled once submitted for printing</li>
            </ul>
          </section>

          <section>
            <h2>8. Refund Policy</h2>
            <p><strong>Subscriptions:</strong></p>
            <ul>
              <li>Full refund within 14 days of initial purchase if unused</li>
              <li>Pro-rated refunds may be provided at our discretion</li>
              <li>No refunds for partial subscription periods</li>
            </ul>
            <p><strong>Printed Books:</strong></p>
            <ul>
              <li>Reprints or refunds for defective products (damaged in shipping, print errors)</li>
              <li>No refunds for buyer&apos;s remorse or content errors you made</li>
              <li>Contact <a href="mailto:support@kinshipvault.com">support@kinshipvault.com</a> within 30 days of receipt</li>
            </ul>
          </section>

          <section>
            <h2>9. Intellectual Property</h2>
            <p>
              Kinship Vault, including its logo, design, and features, is owned by Osifo Holdings L.L.C.
              You may not copy, modify, or distribute our intellectual property without permission.
            </p>
            <p>
              We respect intellectual property rights. To report infringement, contact us at{" "}
              <a href="mailto:legal@kinshipvault.com">legal@kinshipvault.com</a> with:
            </p>
            <ul>
              <li>Description of the copyrighted work</li>
              <li>Location of the infringing material</li>
              <li>Your contact information</li>
              <li>A statement of good faith belief</li>
              <li>Your signature (physical or electronic)</li>
            </ul>
          </section>

          <section>
            <h2>10. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not guarantee that the Service will be uninterrupted, error-free, or secure.
              We are not responsible for any loss of data, although we take reasonable precautions
              to prevent such loss.
            </p>
          </section>

          <section>
            <h2>11. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OSIFO HOLDINGS L.L.C. SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
              LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>
            <p>
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE
              SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING
              THE CLAIM.
            </p>
          </section>

          <section>
            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Osifo Holdings L.L.C. and its officers,
              directors, employees, and agents from any claims, damages, or expenses arising from:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your User Content</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </section>

          <section>
            <h2>13. Termination</h2>
            <p>
              You may terminate your account at any time through your account settings or by
              contacting us. We may suspend or terminate your account if you violate these Terms.
            </p>
            <p>
              Upon termination:
            </p>
            <ul>
              <li>Your access to the Service will cease</li>
              <li>We will delete your data within 30 days (unless legally required to retain)</li>
              <li>Any pending print orders will be completed</li>
              <li>No refunds for unused subscription time, except as required by law</li>
            </ul>
          </section>

          <section>
            <h2>14. Governing Law and Disputes</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, United States,
              without regard to conflict of law principles.
            </p>
            <p>
              Any disputes shall be resolved through binding arbitration in accordance with
              the rules of the American Arbitration Association, except that either party may
              seek injunctive relief in court for intellectual property violations.
            </p>
            <p>
              You waive any right to participate in class action lawsuits against us.
            </p>
          </section>

          <section>
            <h2>15. General Provisions</h2>
            <ul>
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and us</li>
              <li><strong>Severability:</strong> If any provision is unenforceable, the remaining provisions remain in effect</li>
              <li><strong>Waiver:</strong> Failure to enforce any right does not waive that right</li>
              <li><strong>Assignment:</strong> You may not assign these Terms; we may assign them in a business transfer</li>
            </ul>
          </section>

          <section>
            <h2>16. Contact Information</h2>
            <p>For questions about these Terms, please contact us:</p>
            <ul className="contact-list">
              <li>Email: <a href="mailto:legal@kinshipvault.com">legal@kinshipvault.com</a></li>
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
