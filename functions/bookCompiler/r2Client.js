/**
 * R2 Client for Book Artifacts
 *
 * IMMUTABILITY CONTRACT:
 * - A compiled book PDF is NEVER overwritten. Ever.
 * - Recompilation creates a NEW artifact with a new hash
 * - R2 keys are NEVER reused
 * - This enables: legal defensibility, customer trust, reprint guarantees, estate/archival use
 *
 * Books are records, not files.
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

// Lazy-initialized client
let r2Client = null;

/**
 * Get or create the R2 client
 */
function getR2Client() {
  if (!r2Client) {
    const endpoint = process.env.R2_BOOKS_ENDPOINT;
    const accessKeyId = process.env.R2_BOOKS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_BOOKS_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "R2 configuration missing. Required: R2_BOOKS_ENDPOINT, R2_BOOKS_ACCESS_KEY_ID, R2_BOOKS_SECRET_ACCESS_KEY"
      );
    }

    r2Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return r2Client;
}

const BUCKET = process.env.R2_BOOKS_BUCKET || "kinship-vault-books";

/**
 * Generate a unique, content-based hash for a book compilation
 *
 * Hash includes:
 * - Family ID
 * - Page IDs in order
 * - Page update timestamps
 * - Book size
 * - Compilation timestamp (ensures uniqueness even for same content)
 *
 * @param {string} familyId - Family identifier
 * @param {Array} pages - Array of { id, updatedAt } objects
 * @param {string} bookSize - Book size key
 * @returns {string} 16-character hex hash
 */
function generateBookHash(familyId, pages, bookSize) {
  const content = [
    familyId,
    bookSize,
    // Include page IDs and their last modification time
    ...pages.map((p) => {
      const ts = p.updatedAt?.toMillis?.() || p.updatedAt || 0;
      return `${p.id}:${ts}`;
    }),
    // Add compilation timestamp for guaranteed uniqueness
    Date.now().toString(36),
  ].join("|");

  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Generate the R2 key for a compiled book
 *
 * Format: {familyId}/compiled/{hash}-{bookSize}-{timestamp}.pdf
 *
 * The timestamp ensures we NEVER reuse keys, even if hash collides
 *
 * @param {string} familyId - Family identifier
 * @param {string} hash - Content hash
 * @param {string} bookSize - Book size key
 * @returns {string} R2 object key
 */
function generateCompiledBookKey(familyId, hash, bookSize) {
  const timestamp = Date.now().toString(36);
  return `${familyId}/compiled/${hash}-${bookSize}-${timestamp}.pdf`;
}

/**
 * Generate the R2 key for an individual page PDF
 *
 * Format: {familyId}/pages/{pageId}-{pageHash}-300dpi.pdf
 *
 * @param {string} familyId - Family identifier
 * @param {string} pageId - Page identifier
 * @param {string} pageHash - Hash of page content/timestamp
 * @returns {string} R2 object key
 */
function generatePageKey(familyId, pageId, pageHash) {
  return `${familyId}/pages/${pageId}-${pageHash}-300dpi.pdf`;
}

/**
 * Check if an artifact exists in R2 (for cache lookup)
 *
 * @param {string} key - R2 object key
 * @returns {Promise<boolean>} True if exists
 */
async function artifactExists(key) {
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}

/**
 * Upload a compiled book PDF to R2
 *
 * IMMUTABILITY: This function will FAIL if the key already exists.
 * Callers must generate a new key for recompilation.
 *
 * @param {string} key - R2 object key (must be unique)
 * @param {Buffer} pdfBuffer - PDF content
 * @param {Object} metadata - Artifact metadata
 * @returns {Promise<Object>} Upload result with key and URL
 */
async function uploadCompiledBook(key, pdfBuffer, metadata = {}) {
  // IMMUTABILITY CHECK: Verify key doesn't exist
  const exists = await artifactExists(key);
  if (exists) {
    throw new Error(
      `IMMUTABILITY VIOLATION: Attempted to overwrite existing artifact at ${key}. ` +
        "Compiled books are immutable. Generate a new key for recompilation."
    );
  }

  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      // Store artifact metadata for traceability
      Metadata: {
        "x-kv-artifact-type": "compiled-book",
        "x-kv-family-id": metadata.familyId || "",
        "x-kv-book-size": metadata.bookSize || "",
        "x-kv-page-count": String(metadata.pageCount || 0),
        "x-kv-compiled-at": new Date().toISOString(),
        "x-kv-compiled-by": metadata.compiledBy || "",
        "x-kv-job-id": metadata.jobId || "",
        // Store warning summary for quick reference
        "x-kv-warning-count": String(metadata.warningCount || 0),
        "x-kv-critical-count": String(metadata.criticalCount || 0),
      },
    })
  );

  return {
    key,
    bucket: BUCKET,
    uploadedAt: new Date().toISOString(),
    sizeBytes: pdfBuffer.length,
  };
}

/**
 * Upload an individual page PDF to R2
 *
 * Page PDFs can be cached and reused if the page hasn't changed.
 *
 * @param {string} key - R2 object key
 * @param {Buffer} pdfBuffer - PDF content
 * @param {Object} metadata - Page metadata
 * @returns {Promise<Object>} Upload result
 */
async function uploadPagePdf(key, pdfBuffer, metadata = {}) {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      Metadata: {
        "x-kv-artifact-type": "page-pdf",
        "x-kv-family-id": metadata.familyId || "",
        "x-kv-page-id": metadata.pageId || "",
        "x-kv-rendered-at": new Date().toISOString(),
      },
    })
  );

  return {
    key,
    bucket: BUCKET,
    uploadedAt: new Date().toISOString(),
    sizeBytes: pdfBuffer.length,
  };
}

/**
 * Download an artifact from R2
 *
 * @param {string} key - R2 object key
 * @returns {Promise<Buffer>} PDF buffer
 */
async function downloadArtifact(key) {
  const client = getR2Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  // Convert stream to buffer
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Generate a presigned download URL for a compiled book
 *
 * @param {string} key - R2 object key
 * @param {number} expiresIn - URL validity in seconds (default: 1 hour)
 * @returns {Promise<Object>} URL and expiration info
 */
async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return {
    url,
    expiresAt: expiresAt.toISOString(),
    expiresIn,
  };
}

/**
 * Generate a presigned URL for Lulu print fulfillment
 *
 * Lulu's API doesn't accept file uploads - it fetches the PDF from a URL.
 * This generates a temporary "VIP Pass" URL that Lulu can use to download
 * the file without needing master credentials.
 *
 * 24-hour expiry is long enough to survive Lulu's print queue,
 * but short enough to keep the asset secure.
 *
 * @param {string} key - R2 object key for the compiled book
 * @returns {Promise<Object>} URL and expiration info for Lulu
 */
async function getPresignedUrlForLulu(key) {
  // 24 hours in seconds - survives Lulu's queue
  const LULU_EXPIRY_SECONDS = 24 * 60 * 60; // 86400

  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn: LULU_EXPIRY_SECONDS });
  const expiresAt = new Date(Date.now() + LULU_EXPIRY_SECONDS * 1000);

  return {
    url,
    expiresAt: expiresAt.toISOString(),
    expiresIn: LULU_EXPIRY_SECONDS,
    purpose: "lulu_fulfillment",
  };
}

/**
 * List all compiled books for a family (for history/archive)
 *
 * @param {string} familyId - Family identifier
 * @returns {Promise<Array>} List of compiled book artifacts
 */
async function listCompiledBooks(familyId) {
  const client = getR2Client();

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${familyId}/compiled/`,
    })
  );

  return (response.Contents || []).map((obj) => ({
    key: obj.Key,
    size: obj.Size,
    lastModified: obj.LastModified,
  }));
}

/**
 * Generate a hash for a single page (for cache key)
 *
 * @param {Object} page - Page data
 * @returns {string} 8-character hex hash
 */
function generatePageHash(page) {
  const content = [
    page.id,
    page.updatedAt?.toMillis?.() || page.updatedAt || 0,
    // Include state hash if available
    page.state ? JSON.stringify(page.state).length : 0,
  ].join("|");

  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
}

module.exports = {
  BUCKET,
  getR2Client,
  generateBookHash,
  generateCompiledBookKey,
  generatePageKey,
  generatePageHash,
  artifactExists,
  uploadCompiledBook,
  uploadPagePdf,
  downloadArtifact,
  getPresignedDownloadUrl,
  getPresignedUrlForLulu,
  listCompiledBooks,
};
