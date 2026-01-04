/**
 * Batch Page Renderer
 *
 * Firestore-triggered function that renders pages in batches.
 * Uses deviceScaleFactor for true 300 DPI output (Lulu 2026 spec).
 *
 * Key insight: Don't scale the viewport to 3000px. Instead:
 * - Set viewport to base size (e.g., 720x720 for 10x10")
 * - Set deviceScaleFactor to 4.166 (300/72)
 * - This keeps text/vectors sharp while achieving 300 DPI raster output
 */

const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
const {
  BOOK_SIZES,
  DEVICE_SCALE_FACTOR,
  MARGINS,
  getPageDimensions,
} = require("./dimensions");
const {
  generatePageKey,
  generatePageHash,
  uploadPagePdf,
  artifactExists,
} = require("./r2Client");

// Lazy-loaded Puppeteer
let puppeteerCore = null;
let chromium = null;

async function getPuppeteer() {
  if (!puppeteerCore) {
    puppeteerCore = require("puppeteer-core");
    chromium = require("@sparticuz/chromium");
  }
  return { puppeteerCore, chromium };
}

// Number of pages to render per batch (memory-safe)
const BATCH_SIZE = 5;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000];

/**
 * Create a signed render token for secure page access
 *
 * @param {string} familyId - Family ID
 * @param {string} pageId - Page ID
 * @param {number} expiresIn - Token validity in seconds
 * @returns {string} Signed token
 */
function createRenderToken(familyId, pageId, expiresIn = 300) {
  const secret = process.env.RENDER_TOKEN_SECRET || "dev-secret";
  const payload = {
    familyId,
    pageId,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Render a single page to PDF using Puppeteer
 *
 * Uses deviceScaleFactor for true 300 DPI output per Lulu 2026 spec.
 *
 * @param {string} familyId - Family ID
 * @param {string} pageId - Page ID
 * @param {string} bookSize - Book size key
 * @returns {Promise<Buffer>} PDF buffer
 */
async function renderPageToPdf(familyId, pageId, bookSize) {
  const { puppeteerCore, chromium } = await getPuppeteer();
  const dims = getPageDimensions(bookSize, true);

  // Create secure render token
  const token = createRenderToken(familyId, pageId);

  // Build render URL with parameters
  const renderBaseUrl = process.env.RENDER_BASE_URL || "http://localhost:3000";
  const renderUrl = new URL(`/render/${familyId}/${pageId}`, renderBaseUrl);
  renderUrl.searchParams.set("token", token);
  renderUrl.searchParams.set("bookSize", bookSize);
  renderUrl.searchParams.set("includeBleed", "true");
  renderUrl.searchParams.set("forPrint", "true");

  let browser = null;

  try {
    // Launch browser with optimal settings for PDF rendering
    browser = await puppeteerCore.launch({
      args: [
        ...chromium.args,
        "--disable-web-security", // Allow cross-origin images
        "--font-render-hinting=none", // Better font rendering
      ],
      defaultViewport: {
        // Use BASE dimensions, not scaled (deviceScaleFactor handles scaling)
        width: dims.viewport.width,
        height: dims.viewport.height,
        // THIS IS THE KEY: deviceScaleFactor gives us 300 DPI output
        deviceScaleFactor: DEVICE_SCALE_FACTOR,
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Navigate to render page
    await page.goto(renderUrl.toString(), {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Wait for render completion signal
    await page.waitForSelector("[data-render-ready]", { timeout: 30000 });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Additional buffer for complex renders
    await new Promise((r) => setTimeout(r, 500));

    // Generate PDF with exact dimensions
    const pdfBuffer = await page.pdf({
      width: `${dims.output.width}px`,
      height: `${dims.output.height}px`,
      printBackground: true,
      preferCSSPageSize: false,
      // No margins - we handle bleed in the render
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Render a page with retry logic
 *
 * @param {string} familyId - Family ID
 * @param {string} pageId - Page ID
 * @param {string} bookSize - Book size key
 * @param {number} attempt - Current attempt number
 * @returns {Promise<Buffer>} PDF buffer
 */
async function renderWithRetry(familyId, pageId, bookSize, attempt = 0) {
  try {
    return await renderPageToPdf(familyId, pageId, bookSize);
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`Retry ${attempt + 1}/${MAX_RETRIES} for page ${pageId}: ${error.message}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      return renderWithRetry(familyId, pageId, bookSize, attempt + 1);
    }
    throw error;
  }
}

/**
 * Update job progress in Firestore
 *
 * @param {string} familyId - Family ID
 * @param {string} jobId - Job ID
 * @param {Object} update - Fields to update
 */
async function updateJobProgress(familyId, jobId, update) {
  const db = getFirestore();
  await db
    .collection("families")
    .doc(familyId)
    .collection("compilationJobs")
    .doc(jobId)
    .update({
      ...update,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Process a batch of pages
 *
 * @param {Object} job - CompilationJob data
 * @param {string} jobId - Job document ID
 * @returns {Promise<Object>} Batch result
 */
async function processBatch(job, jobId) {
  const { familyId, bookSize, pageIds, pagesRendered, currentBatch } = job;
  const db = getFirestore();

  // Calculate which pages to render in this batch
  const startIndex = currentBatch * BATCH_SIZE;
  const endIndex = Math.min(startIndex + BATCH_SIZE, pageIds.length);
  const batchPageIds = pageIds.slice(startIndex, endIndex);

  if (batchPageIds.length === 0) {
    // No more pages - move to merge phase
    return { done: true, pagesRendered };
  }

  console.log(
    `Processing batch ${currentBatch + 1}: pages ${startIndex + 1}-${endIndex} of ${pageIds.length}`
  );

  const results = [];
  let renderedCount = pagesRendered;

  for (const pageId of batchPageIds) {
    try {
      // Fetch page data for hash
      const pageDoc = await db
        .collection("families")
        .doc(familyId)
        .collection("pages")
        .doc(pageId)
        .get();

      if (!pageDoc.exists) {
        throw new Error(`Page ${pageId} not found`);
      }

      const pageData = pageDoc.data();
      const pageHash = generatePageHash({ id: pageId, updatedAt: pageData.updatedAt });
      const r2Key = generatePageKey(familyId, pageId, pageHash);

      // Check if page PDF already cached
      const cached = await artifactExists(r2Key);

      if (cached) {
        console.log(`Page ${pageId} already cached at ${r2Key}`);
        results.push({ pageId, r2Key, cached: true });
      } else {
        // Render the page
        console.log(`Rendering page ${pageId}...`);
        const pdfBuffer = await renderWithRetry(familyId, pageId, bookSize);

        // Upload to R2
        await uploadPagePdf(r2Key, pdfBuffer, {
          familyId,
          pageId,
        });

        console.log(`Page ${pageId} rendered and uploaded to ${r2Key}`);
        results.push({ pageId, r2Key, cached: false, sizeBytes: pdfBuffer.length });
      }

      renderedCount++;

      // Update progress after each page
      await updateJobProgress(familyId, jobId, {
        pagesRendered: renderedCount,
      });
    } catch (error) {
      console.error(`Failed to render page ${pageId}:`, error);

      // Update job with error
      await updateJobProgress(familyId, jobId, {
        status: "failed",
        errorMessage: `Failed to render page ${pageId}: ${error.message}`,
        failedPageId: pageId,
      });

      throw error;
    }
  }

  // Check if all pages are done
  const allDone = endIndex >= pageIds.length;

  if (allDone) {
    // Move to merge phase
    await updateJobProgress(familyId, jobId, {
      status: "merging",
      pagesRendered: renderedCount,
    });
    return { done: true, pagesRendered: renderedCount, results };
  } else {
    // Schedule next batch
    await updateJobProgress(familyId, jobId, {
      currentBatch: currentBatch + 1,
      pagesRendered: renderedCount,
    });
    return { done: false, pagesRendered: renderedCount, results, nextBatch: currentBatch + 1 };
  }
}

/**
 * Handle job status changes to trigger batch processing
 *
 * This is called by the Firestore trigger when a job document changes.
 *
 * @param {Object} change - Firestore document change
 * @returns {Promise<void>}
 */
async function handleJobChange(change) {
  const before = change.before?.data();
  const after = change.after?.data();

  // Only process if job exists and is in rendering state
  if (!after || after.status === "complete" || after.status === "failed") {
    return;
  }

  const jobId = change.after.id;

  // Start rendering on new job (status: pending)
  if (after.status === "pending") {
    console.log(`Starting render for job ${jobId}`);

    await updateJobProgress(after.familyId, jobId, {
      status: "rendering",
      currentBatch: 0,
    });

    // Process first batch
    await processBatch({ ...after, currentBatch: 0 }, jobId);
    return;
  }

  // Continue rendering if batch was just updated
  if (
    after.status === "rendering" &&
    before?.currentBatch !== after.currentBatch
  ) {
    console.log(`Continuing render for job ${jobId}, batch ${after.currentBatch}`);
    await processBatch(after, jobId);
    return;
  }
}

module.exports = {
  BATCH_SIZE,
  createRenderToken,
  renderPageToPdf,
  renderWithRetry,
  updateJobProgress,
  processBatch,
  handleJobChange,
};
