// functions/emails/resend.js
// Resend email client for transactional emails

const { Resend } = require("resend");

let resendClient = null;

/**
 * Get or create the Resend client
 * @returns {Resend|null}
 */
function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured - emails will not be sent");
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send an email using Resend
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content (optional)
 * @param {string} [options.from] - From address (defaults to configured sender)
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
async function sendEmail({ to, subject, html, text, from }) {
  const client = getResendClient();

  if (!client) {
    console.log("Email not sent (no Resend client):", { to, subject });
    return { success: false, error: "Resend not configured" };
  }

  const fromAddress = from || "Kinship Vault <hello@kinshipvault.com>";

  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || undefined,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Email sent successfully:", data.id);
    return { success: true, id: data.id };
  } catch (err) {
    console.error("Failed to send email:", err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getResendClient,
  sendEmail,
};
