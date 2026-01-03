// functions/emails/templates/eventOnboarding.js
// Event Pack Onboarding Email - "Keys to the Vault"

const APP_URL = process.env.APP_URL || "https://kinshipvault.com";

/**
 * Generate the Event Pack onboarding email HTML
 * @param {Object} options
 * @param {string} options.recipientName - Name of the recipient
 * @param {string} options.familyName - Name of the family/event
 * @param {string} options.familyId - Family ID for dashboard links
 * @returns {string} HTML email content
 */
function generateEventOnboardingEmail({ recipientName, familyName, familyId }) {
  const qrUrl = `${APP_URL}/families/${familyId}/qr`;
  const moderateUrl = `${APP_URL}/families/${familyId}/moderate`;
  const storyUrl = `${APP_URL}/families/${familyId}/story`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Wedding Vault is Live!</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FDF8F0;
      color: #1f2937;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
      padding: 48px 40px;
      text-align: center;
    }
    .header-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .header h1 {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
      letter-spacing: -0.02em;
    }
    .header p {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      margin: 0;
    }
    .content {
      padding: 40px;
    }
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 24px;
    }
    .greeting strong {
      color: #1f2937;
    }
    .intro {
      background: linear-gradient(135deg, #fef3e2 0%, #fdf8f0 100%);
      border-left: 4px solid #e11d48;
      padding: 20px 24px;
      margin-bottom: 32px;
      border-radius: 0 12px 12px 0;
    }
    .intro p {
      margin: 0;
      color: #374151;
      font-size: 15px;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .section-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .section h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin: 0;
      line-height: 28px;
    }
    .section p {
      color: #4b5563;
      font-size: 15px;
      margin: 0 0 16px;
      padding-left: 40px;
    }
    .section .action {
      padding-left: 40px;
      margin-bottom: 8px;
    }
    .action-label {
      display: inline-block;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .pro-tip {
      background: #fef3c7;
      border-radius: 8px;
      padding: 12px 16px;
      margin-left: 40px;
      margin-top: 12px;
    }
    .pro-tip-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #d97706;
      margin-bottom: 4px;
    }
    .pro-tip p {
      margin: 0;
      padding: 0;
      font-size: 14px;
      color: #92400e;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 14px 28px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);
    }
    .button:hover {
      opacity: 0.95;
    }
    .button-secondary {
      background: #ffffff;
      color: #374151 !important;
      border: 2px solid #e5e7eb;
      box-shadow: none;
    }
    .cta-section {
      text-align: center;
      padding: 32px 40px;
      background: linear-gradient(135deg, #fdf8f0 0%, #fef3e2 100%);
      border-top: 1px solid #f3f4f6;
    }
    .cta-section h3 {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 8px;
    }
    .cta-section p {
      color: #6b7280;
      font-size: 14px;
      margin: 0 0 24px;
    }
    .footer {
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
    }
    .footer p {
      color: #9ca3af;
      font-size: 13px;
      margin: 0 0 8px;
    }
    .footer a {
      color: #e11d48;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background: #f3f4f6;
      margin: 32px 0;
    }
    @media (max-width: 600px) {
      .content {
        padding: 24px;
      }
      .header {
        padding: 32px 24px;
      }
      .section p,
      .section .action,
      .pro-tip {
        padding-left: 0;
        margin-left: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">&#x1F511;</div>
      <h1>The memories start now.</h1>
      <p>Your Event Pack is officially active</p>
    </div>

    <div class="content">
      <p class="greeting">
        Hi <strong>${recipientName || "there"}</strong>,
      </p>

      <div class="intro">
        <p>
          Congratulations! Your Kinship Vault Event Pack is officially active for <strong>${familyName}</strong>.
          You and your co-editors are now the custodians of this family legacy.
        </p>
      </div>

      <p style="color: #374151; font-size: 15px; margin-bottom: 32px;">
        To make sure your memories are captured perfectly, here are the four things you need to know:
      </p>

      <!-- Section 1: QR Code -->
      <div class="section">
        <div class="section-header">
          <span class="section-number">1</span>
          <h2>The QR Code: Your Digital "Guestbook"</h2>
        </div>
        <p>
          Your guests can upload photos and videos <strong>without downloading an app or creating an account</strong>.
          Just scan and share.
        </p>
        <div class="action">
          <span class="action-label">Action</span>
          <p style="padding: 0; margin: 8px 0 0;">
            Log in and head to your <a href="${qrUrl}" style="color: #e11d48;">QR Dashboard</a>.
          </p>
        </div>
        <div class="pro-tip">
          <div class="pro-tip-label">Pro Tip</div>
          <p>Print this code on your table cards, "Order of Service," or place a large framed version at the bar.</p>
        </div>
      </div>

      <!-- Section 2: Moderation Queue -->
      <div class="section">
        <div class="section-header">
          <span class="section-number">2</span>
          <h2>The Moderation Queue: You're in Control</h2>
        </div>
        <p>
          Unlike social media, <strong>nothing goes live in your Vault until you say so</strong>.
          When guests scan and upload, the photos land in your Moderation Queue.
        </p>
        <p style="margin-bottom: 8px;">
          <strong>How it works:</strong> You (or any of your 5 editors) can "Approve" to send a photo to the
          scrapbook or "Reject" to delete it.
        </p>
        <p>
          <strong>The Benefit:</strong> No blurry accidental shots or duplicates—only the best angles make the cut.
        </p>
        <div class="action">
          <a href="${moderateUrl}" class="button button-secondary" style="display: inline-block; margin-top: 8px;">
            View Moderation Queue
          </a>
        </div>
      </div>

      <!-- Section 3: View Links -->
      <div class="section">
        <div class="section-header">
          <span class="section-number">3</span>
          <h2>The "Live View" for Guests</h2>
        </div>
        <p>
          Once you approve a guest's upload, they automatically receive a <strong>View-Only Link</strong>.
        </p>
        <p>
          <strong>The Experience:</strong> They can revisit the Vault anytime to see the pages you've designed,
          but they cannot edit or see the moderation queue. It's their private window into your story.
        </p>
      </div>

      <!-- Section 4: Morning After -->
      <div class="section">
        <div class="section-header">
          <span class="section-number">4</span>
          <h2>Pro-Tip: The "Morning After" Ritual</h2>
        </div>
        <p>
          We recommend sitting down with your co-editors the morning after your event.
          Seeing the "Pending" queue filled with 100+ different perspectives of your day is the best way to
          relive the magic while it's fresh.
        </p>
      </div>

      <div class="divider"></div>

      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Need a hand? Reply to this email anytime. Our team is standing by to help you preserve these moments.
      </p>
    </div>

    <div class="cta-section">
      <h3>Ready to get started?</h3>
      <p>Your Vault is waiting for its first memories.</p>
      <a href="${storyUrl}" class="button">Enter My Vault</a>
    </div>

    <div class="footer">
      <p>You're receiving this because you're an editor on ${familyName}.</p>
      <p>
        <a href="${APP_URL}">Kinship Vault</a> — Preserving what matters most.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of the email
 */
function generateEventOnboardingText({ recipientName, familyName, familyId }) {
  const qrUrl = `${APP_URL}/families/${familyId}/qr`;
  const moderateUrl = `${APP_URL}/families/${familyId}/moderate`;
  const storyUrl = `${APP_URL}/families/${familyId}/story`;

  return `
THE MEMORIES START NOW
Your Event Pack is officially active

Hi ${recipientName || "there"},

Congratulations! Your Kinship Vault Event Pack is officially active for ${familyName}. You and your co-editors are now the custodians of this family legacy.

To make sure your memories are captured perfectly, here are the four things you need to know:

---

1. THE QR CODE: YOUR DIGITAL "GUESTBOOK"

Your guests can upload photos and videos without downloading an app or creating an account. Just scan and share.

Action: Log in and head to your QR Dashboard: ${qrUrl}

Pro Tip: Print this code on your table cards, "Order of Service," or place a large framed version at the bar.

---

2. THE MODERATION QUEUE: YOU'RE IN CONTROL

Unlike social media, nothing goes live in your Vault until you say so. When guests scan and upload, the photos land in your Moderation Queue.

How it works: You (or any of your 5 editors) can "Approve" to send a photo to the scrapbook or "Reject" to delete it.

The Benefit: No blurry accidental shots or duplicates—only the best angles make the cut.

View Moderation Queue: ${moderateUrl}

---

3. THE "LIVE VIEW" FOR GUESTS

Once you approve a guest's upload, they automatically receive a View-Only Link.

The Experience: They can revisit the Vault anytime to see the pages you've designed, but they cannot edit or see the moderation queue. It's their private window into your story.

---

4. PRO-TIP: THE "MORNING AFTER" RITUAL

We recommend sitting down with your co-editors the morning after your event. Seeing the "Pending" queue filled with 100+ different perspectives of your day is the best way to relive the magic while it's fresh.

---

Need a hand? Reply to this email anytime. Our team is standing by to help you preserve these moments.

Enter My Vault: ${storyUrl}

---

You're receiving this because you're an editor on ${familyName}.
Kinship Vault — Preserving what matters most.
${APP_URL}
  `.trim();
}

module.exports = {
  generateEventOnboardingEmail,
  generateEventOnboardingText,
};
