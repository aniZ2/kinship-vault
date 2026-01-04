// functions/renderPage.js
// Cloud Function to render scrapbook pages using Puppeteer

const admin = require("firebase-admin");
const crypto = require("crypto");

// Lazy-load puppeteer to reduce cold start time
let puppeteerCore;
let chromium;

async function getPuppeteer() {
  if (!puppeteerCore) {
    puppeteerCore = require("puppeteer-core");
    chromium = require("@sparticuz/chromium");
  }
  return { puppeteerCore, chromium };
}

const RENDER_SECRET = process.env.RENDER_SECRET || "dev-secret-change-in-production";
const RENDER_BASE_URL = process.env.RENDER_BASE_URL || "https://kinshipvault.com";

// Canvas dimensions
const CANVAS_WIDTH = 612;  // 8.5" at 72dpi
const CANVAS_HEIGHT = 792; // 11" at 72dpi

/**
 * Create a signed render token
 */
function createRenderToken(familyId, pageId, quality) {
  const payload = {
    familyId,
    pageId,
    timestamp: Date.now(),
    quality,
  };

  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", RENDER_SECRET)
    .update(data)
    .digest("hex");

  return Buffer.from(`${data}.${signature}`).toString("base64url");
}

/**
 * Check if user has Pro subscription
 */
async function isProUser(uid) {
  const db = admin.firestore();
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    const data = userDoc.data();

    // Check subscription status
    if (data?.subscription?.status === "active") return true;
    if (data?.subscription?.status === "trialing") return true;

    // Check if any family they own has a Pro subscription
    const memberships = await db
      .collection("memberships")
      .where("uid", "==", uid)
      .where("role", "==", "owner")
      .get();

    for (const mem of memberships.docs) {
      const familyDoc = await db.collection("families").doc(mem.data().familyId).get();
      const familyData = familyDoc.data();
      if (familyData?.subscription?.status === "active" ||
          familyData?.subscription?.status === "trialing") {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking Pro status:", error);
    return false;
  }
}

/**
 * Render a page using Puppeteer
 */
async function renderPage(familyId, pageId, format, quality) {
  const { puppeteerCore, chromium } = await getPuppeteer();

  // Calculate scale factor
  const scaleFactor = quality === "pro" ? 4.17 : 1; // 300dpi / 72dpi = 4.17
  const width = Math.round(CANVAS_WIDTH * scaleFactor);
  const height = Math.round(CANVAS_HEIGHT * scaleFactor);

  // Create render token
  const token = createRenderToken(familyId, pageId, quality);
  const renderUrl = `${RENDER_BASE_URL}/render/${familyId}/${pageId}?token=${token}&scale=${scaleFactor}`;

  console.log("Launching browser for render:", { familyId, pageId, format, quality, width, height });

  // Launch browser
  const browser = await puppeteerCore.launch({
    args: chromium.args,
    defaultViewport: {
      width,
      height,
      deviceScaleFactor: 1, // We handle scaling in the render page
    },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // Navigate to render page
    console.log("Navigating to:", renderUrl);
    await page.goto(renderUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for the ready signal
    await page.waitForSelector("[data-render-ready]", { timeout: 30000 });
    console.log("Page ready, capturing...");

    // Additional wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 500));

    let result;
    if (format === "pdf") {
      // Generate PDF
      result = await page.pdf({
        width: `${CANVAS_WIDTH / 72}in`,
        height: `${CANVAS_HEIGHT / 72}in`,
        printBackground: true,
        preferCSSPageSize: false,
      });
    } else {
      // Generate screenshot
      const screenshotOptions = {
        type: quality === "pro" ? "png" : "jpeg",
        fullPage: true,
        omitBackground: false,
      };
      if (quality !== "pro") {
        screenshotOptions.quality = 85;
      }
      result = await page.screenshot(screenshotOptions);
    }

    console.log("Capture complete, size:", result.length);
    return result;

  } finally {
    await browser.close();
  }
}

module.exports = {
  renderPage,
  isProUser,
  createRenderToken,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
};
