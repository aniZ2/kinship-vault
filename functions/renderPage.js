// functions/renderPage.js
// Cloud Function to render scrapbook pages using Puppeteer
// Supports both legacy single-page rendering and book compiler batch rendering

const admin = require("firebase-admin");
const crypto = require("crypto");

// Book compiler dimensions (Lulu 2026 specs)
const {
  BOOK_SIZES,
  DEVICE_SCALE_FACTOR,
  getPageDimensions,
  BLEED_INCHES,
  SAFETY_MARGIN_INCHES,
} = require("./bookCompiler/dimensions");

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

// Legacy canvas dimensions (8.5x11 at 72dpi) - for backwards compatibility
const CANVAS_WIDTH = 612;  // 8.5" at 72dpi
const CANVAS_HEIGHT = 792; // 11" at 72dpi

/**
 * Create a signed render token
 * @param {string} familyId - Family ID
 * @param {string} pageId - Page ID
 * @param {string} quality - 'standard' or 'pro'
 * @param {Object} options - Additional options for book compilation
 * @param {string} options.bookSize - Book size key ('8x8', '10x10', '8.5x11')
 * @param {boolean} options.includeBleed - Whether to include bleed area
 * @param {boolean} options.forPrint - Whether this is for print (affects rendering)
 */
function createRenderToken(familyId, pageId, quality, options = {}) {
  const payload = {
    familyId,
    pageId,
    timestamp: Date.now(),
    quality,
    // Book compiler options
    bookSize: options.bookSize || null,
    includeBleed: options.includeBleed || false,
    forPrint: options.forPrint || false,
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

/**
 * Render a page for book compilation using Lulu 2026 specs
 *
 * Key differences from legacy renderPage:
 * - Uses deviceScaleFactor for true 300 DPI (not viewport scaling)
 * - Supports multiple book sizes (8x8, 10x10, 8.5x11)
 * - Includes bleed area for full-bleed printing
 * - Returns PDF buffer for merging
 *
 * @param {string} familyId - Family ID
 * @param {string} pageId - Page ID
 * @param {string} bookSize - Book size key ('8x8', '10x10', '8.5x11')
 * @param {boolean} includeBleed - Whether to include bleed margins
 * @returns {Promise<Buffer>} PDF buffer
 */
async function renderPageForBook(familyId, pageId, bookSize, includeBleed = true) {
  const { puppeteerCore, chromium } = await getPuppeteer();

  // Get dimensions for this book size
  const dims = getPageDimensions(bookSize, includeBleed);

  // Create render token with book options
  const token = createRenderToken(familyId, pageId, "pro", {
    bookSize,
    includeBleed,
    forPrint: true,
  });

  // Build render URL
  const renderUrl = new URL(`/render/${familyId}/${pageId}`, RENDER_BASE_URL);
  renderUrl.searchParams.set("token", token);
  renderUrl.searchParams.set("bookSize", bookSize);
  renderUrl.searchParams.set("includeBleed", includeBleed ? "true" : "false");
  renderUrl.searchParams.set("forPrint", "true");

  console.log("Launching browser for book render:", {
    familyId,
    pageId,
    bookSize,
    includeBleed,
    viewport: dims.viewport,
  });

  // Launch browser with deviceScaleFactor for true 300 DPI
  // This is the Lulu 2026 recommended approach:
  // - Set viewport to BASE dimensions (72 DPI)
  // - Set deviceScaleFactor to 4.166 (300/72)
  // - This keeps text/vectors sharp while achieving 300 DPI raster output
  const browser = await puppeteerCore.launch({
    args: [
      ...chromium.args,
      "--disable-web-security", // Allow cross-origin images
      "--font-render-hinting=none", // Better font rendering for print
    ],
    defaultViewport: {
      width: dims.viewport.width,
      height: dims.viewport.height,
      deviceScaleFactor: DEVICE_SCALE_FACTOR, // 4.166 for 300 DPI
    },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // Navigate to render page
    console.log("Navigating to:", renderUrl.toString());
    await page.goto(renderUrl.toString(), {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Wait for the ready signal
    await page.waitForSelector("[data-render-ready]", { timeout: 30000 });
    console.log("Page ready for book render, capturing PDF...");

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Additional buffer for complex renders
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate PDF with exact dimensions
    // Using pixel dimensions (which are already scaled by deviceScaleFactor)
    const pdfBuffer = await page.pdf({
      width: `${dims.output.width}px`,
      height: `${dims.output.height}px`,
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    console.log("Book page PDF capture complete, size:", pdfBuffer.length);
    return Buffer.from(pdfBuffer);

  } finally {
    await browser.close();
  }
}

module.exports = {
  // Legacy exports
  renderPage,
  isProUser,
  createRenderToken,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  // Book compiler exports
  renderPageForBook,
  BOOK_SIZES,
  DEVICE_SCALE_FACTOR,
  getPageDimensions,
  BLEED_INCHES,
  SAFETY_MARGIN_INCHES,
};
