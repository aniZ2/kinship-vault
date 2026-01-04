/**
 * PDF Merger for Book Compilation
 *
 * Lulu 2026 "Right-Side" Rule:
 * - Page 1 starts on the RIGHT-hand side (recto)
 * - Odd pages = right side, Even pages = left side
 * - If total page count is ODD, append a blank "End Sheet"
 *   (otherwise the last page backs onto the inside back cover)
 *
 * This ensures proper pagination and professional print output.
 */

const { PDFDocument, rgb } = require("pdf-lib");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getPageDimensions, BOOK_SIZES } = require("./dimensions");
const {
  generatePageKey,
  generatePageHash,
  generateCompiledBookKey,
  downloadArtifact,
  uploadCompiledBook,
  getPresignedDownloadUrl,
} = require("./r2Client");

/**
 * Create a blank page for the end sheet
 *
 * @param {PDFDocument} pdfDoc - The PDF document to add the page to
 * @param {number} width - Page width in points
 * @param {number} height - Page height in points
 * @returns {PDFPage} The blank page
 */
function createBlankEndSheet(pdfDoc, width, height) {
  // Create a blank page with a subtle off-white color
  // This signals intentionality (not a printing error)
  const page = pdfDoc.addPage([width, height]);

  // Fill with a very light cream color
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.98, 0.97, 0.95), // Subtle cream, almost white
  });

  return page;
}

/**
 * Merge individual page PDFs into a single book PDF
 *
 * Implements the Lulu "Right-Side" rule:
 * - If page count is odd, append a blank end sheet
 *
 * @param {Array<Buffer>} pagePdfBuffers - Array of page PDF buffers in order
 * @param {Object} metadata - Book metadata
 * @returns {Promise<Buffer>} Merged PDF buffer
 */
async function mergePagePdfs(pagePdfBuffers, metadata) {
  const { familyName, bookSize, jobId, pageIds } = metadata;
  const dims = getPageDimensions(bookSize, true);

  // Create the merged PDF document
  const mergedPdf = await PDFDocument.create();

  // Set PDF metadata for the artifact
  mergedPdf.setTitle(`${familyName || "Family"} Yearbook`);
  mergedPdf.setAuthor(familyName || "Kinship Vault User");
  mergedPdf.setCreator("Kinship Vault Book Compiler");
  mergedPdf.setProducer("pdf-lib + Kinship Vault");
  mergedPdf.setCreationDate(new Date());
  mergedPdf.setModificationDate(new Date());

  // Add custom metadata for traceability
  mergedPdf.setKeywords([
    `job:${jobId}`,
    `size:${bookSize}`,
    `pages:${pagePdfBuffers.length}`,
    `compiled:${new Date().toISOString()}`,
  ]);

  // Copy each page into the merged document
  for (let i = 0; i < pagePdfBuffers.length; i++) {
    const sourcePdf = await PDFDocument.load(pagePdfBuffers[i]);
    const [sourcePage] = await mergedPdf.copyPages(sourcePdf, [0]);
    mergedPdf.addPage(sourcePage);
  }

  // LULU RIGHT-SIDE RULE:
  // If we have an odd number of pages, add a blank end sheet
  // This prevents the last content page from backing onto the inside back cover
  if (pagePdfBuffers.length % 2 === 1) {
    console.log(
      `Adding blank end sheet (odd page count: ${pagePdfBuffers.length})`
    );

    // Get page dimensions from the last page (they should all be the same)
    const lastPage = mergedPdf.getPage(mergedPdf.getPageCount() - 1);
    const { width, height } = lastPage.getSize();

    createBlankEndSheet(mergedPdf, width, height);
  }

  // Save and return the merged PDF
  const pdfBytes = await mergedPdf.save();
  return Buffer.from(pdfBytes);
}

/**
 * Handle the merge phase of book compilation
 *
 * Called when all pages have been rendered (status: merging)
 *
 * @param {Object} job - CompilationJob data
 * @param {string} jobId - Job document ID
 * @returns {Promise<Object>} Merge result
 */
async function handleMergePhase(job, jobId) {
  const db = getFirestore();
  const { familyId, bookSize, pageIds, pagesHash, familyName, bleedValidation } = job;

  console.log(`Starting merge for job ${jobId}: ${pageIds.length} pages`);

  try {
    // Fetch all page PDFs from R2
    const pagePdfBuffers = [];

    for (const pageId of pageIds) {
      // Get page data for hash
      const pageDoc = await db
        .collection("families")
        .doc(familyId)
        .collection("pages")
        .doc(pageId)
        .get();

      if (!pageDoc.exists) {
        throw new Error(`Page ${pageId} not found during merge`);
      }

      const pageData = pageDoc.data();
      const pageHash = generatePageHash({ id: pageId, updatedAt: pageData.updatedAt });
      const r2Key = generatePageKey(familyId, pageId, pageHash);

      console.log(`Downloading page PDF: ${r2Key}`);
      const pdfBuffer = await downloadArtifact(r2Key);
      pagePdfBuffers.push(pdfBuffer);
    }

    // Merge all pages
    console.log("Merging PDFs...");
    const mergedPdf = await mergePagePdfs(pagePdfBuffers, {
      familyName,
      bookSize,
      jobId,
      pageIds,
    });

    // Generate unique key for the compiled book (IMMUTABLE)
    const r2Key = generateCompiledBookKey(familyId, pagesHash, bookSize);

    console.log(`Uploading compiled book to ${r2Key}...`);

    // Upload with metadata (including warning counts for traceability)
    const uploadResult = await uploadCompiledBook(r2Key, mergedPdf, {
      familyId,
      bookSize,
      pageCount: pageIds.length + (pageIds.length % 2 === 1 ? 1 : 0), // Include end sheet
      compiledBy: job.createdBy,
      jobId,
      warningCount: bleedValidation?.summary?.totalWarnings || 0,
      criticalCount: bleedValidation?.summary?.totalCritical || 0,
    });

    // Generate presigned download URL (1 hour validity)
    const downloadInfo = await getPresignedDownloadUrl(r2Key, 3600);

    // Update job as complete
    await db
      .collection("families")
      .doc(familyId)
      .collection("compilationJobs")
      .doc(jobId)
      .update({
        status: "complete",
        r2Key,
        downloadUrl: downloadInfo.url,
        downloadExpiresAt: downloadInfo.expiresAt,
        fileSizeBytes: uploadResult.sizeBytes,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        // Final page count (including end sheet if added)
        finalPageCount: pageIds.length + (pageIds.length % 2 === 1 ? 1 : 0),
      });

    console.log(`Book compilation complete: ${r2Key} (${uploadResult.sizeBytes} bytes)`);

    return {
      success: true,
      r2Key,
      sizeBytes: uploadResult.sizeBytes,
      downloadUrl: downloadInfo.url,
      finalPageCount: pageIds.length + (pageIds.length % 2 === 1 ? 1 : 0),
    };
  } catch (error) {
    console.error(`Merge failed for job ${jobId}:`, error);

    // Update job with error
    await db
      .collection("families")
      .doc(familyId)
      .collection("compilationJobs")
      .doc(jobId)
      .update({
        status: "failed",
        errorMessage: `Merge failed: ${error.message}`,
        updatedAt: FieldValue.serverTimestamp(),
      });

    throw error;
  }
}

/**
 * Refresh the download URL for a completed job
 *
 * Called when the previous URL has expired
 *
 * @param {string} familyId - Family ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} New download URL info
 */
async function refreshDownloadUrl(familyId, jobId) {
  const db = getFirestore();

  const jobDoc = await db
    .collection("families")
    .doc(familyId)
    .collection("compilationJobs")
    .doc(jobId)
    .get();

  if (!jobDoc.exists) {
    throw new Error("Job not found");
  }

  const job = jobDoc.data();

  if (job.status !== "complete" || !job.r2Key) {
    throw new Error("Job not complete or missing R2 key");
  }

  // Generate new presigned URL
  const downloadInfo = await getPresignedDownloadUrl(job.r2Key, 3600);

  // Update job with new URL
  await db
    .collection("families")
    .doc(familyId)
    .collection("compilationJobs")
    .doc(jobId)
    .update({
      downloadUrl: downloadInfo.url,
      downloadExpiresAt: downloadInfo.expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    });

  return downloadInfo;
}

module.exports = {
  createBlankEndSheet,
  mergePagePdfs,
  handleMergePhase,
  refreshDownloadUrl,
};
