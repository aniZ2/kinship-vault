/**
 * Book Compilation Initialization
 *
 * Entry point Cloud Function that:
 * 1. Validates the request and user permissions
 * 2. Fetches locked pages (or user-specified pages)
 * 3. Runs bleed/safety zone validation
 * 4. Creates a CompilationJob document to trigger the pipeline
 *
 * The job document triggers processRenderBatch via Firestore trigger.
 */

const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { BOOK_SIZES } = require("./dimensions");
const { validateBook, createWarningRecord } = require("./bleedCheck");
const { generateBookHash } = require("./r2Client");

/**
 * Verify the user has access to the family
 *
 * @param {string} uid - User ID
 * @param {string} familyId - Family ID
 * @returns {Promise<Object|null>} Family data or null if no access
 */
async function verifyFamilyAccess(uid, familyId) {
  const db = getFirestore();

  // Check family membership
  const memberDoc = await db
    .collection("families")
    .doc(familyId)
    .collection("members")
    .doc(uid)
    .get();

  if (!memberDoc.exists) {
    return null;
  }

  // Get family data
  const familyDoc = await db.collection("families").doc(familyId).get();
  if (!familyDoc.exists) {
    return null;
  }

  return {
    family: { id: familyDoc.id, ...familyDoc.data() },
    member: memberDoc.data(),
  };
}

/**
 * Fetch pages for compilation
 *
 * @param {string} familyId - Family ID
 * @param {Array|null} pageIds - Specific page IDs to include, or null for all locked pages
 * @returns {Promise<Array>} Array of page data
 */
async function fetchPages(familyId, pageIds = null) {
  const db = getFirestore();
  const pagesRef = db.collection("families").doc(familyId).collection("pages");

  let pages = [];

  if (pageIds && pageIds.length > 0) {
    // Fetch specific pages in the order provided
    for (const pageId of pageIds) {
      const doc = await pagesRef.doc(pageId).get();
      if (doc.exists) {
        pages.push({ id: doc.id, ...doc.data() });
      }
    }
  } else {
    // Fetch all locked pages ordered by 'order' field
    const snapshot = await pagesRef
      .where("isLocked", "==", true)
      .orderBy("order", "desc")
      .get();

    pages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  return pages;
}

/**
 * Create a compilation job document
 *
 * @param {Object} params - Job parameters
 * @returns {Promise<Object>} Created job data with ID
 */
async function createCompilationJob(params) {
  const db = getFirestore();
  const {
    familyId,
    createdBy,
    bookSize,
    pageIds,
    totalPages,
    pagesHash,
    warningRecord,
    familyName,
  } = params;

  const jobData = {
    familyId,
    familyName: familyName || "Untitled Family",
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),

    // Configuration
    bookSize,
    bleedInches: 0.125,
    pageIds,

    // Progress tracking
    status: "pending",
    pagesRendered: 0,
    totalPages,
    currentBatch: 0,

    // Content hash for cache invalidation
    pagesHash,

    // ALWAYS persist bleed warnings (even if empty)
    bleedValidation: warningRecord,

    // Output (populated after completion)
    r2Key: null,
    downloadUrl: null,
    downloadExpiresAt: null,
    fileSizeBytes: null,

    // Error tracking
    errorMessage: null,
    failedPageId: null,
  };

  const ref = await db
    .collection("families")
    .doc(familyId)
    .collection("compilationJobs")
    .add(jobData);

  return { id: ref.id, ...jobData };
}

/**
 * Check for existing cached compilation
 *
 * @param {string} familyId - Family ID
 * @param {string} pagesHash - Content hash
 * @param {string} bookSize - Book size
 * @returns {Promise<Object|null>} Existing job if found and complete
 */
async function findCachedCompilation(familyId, pagesHash, bookSize) {
  const db = getFirestore();

  const snapshot = await db
    .collection("families")
    .doc(familyId)
    .collection("compilationJobs")
    .where("pagesHash", "==", pagesHash)
    .where("bookSize", "==", bookSize)
    .where("status", "==", "complete")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Initialize a book compilation
 *
 * @param {Object} req - HTTP request
 * @param {Object} res - HTTP response
 * @param {Object} auth - Verified Firebase auth
 */
async function initializeCompilation(req, res, auth) {
  const { familyId, bookSize, pageIds, forceRecompile } = req.body;

  // Validate required fields
  if (!familyId) {
    return res.status(400).json({ error: "familyId is required" });
  }

  // Validate book size
  if (!bookSize || !BOOK_SIZES[bookSize]) {
    return res.status(400).json({
      error: `Invalid bookSize. Valid options: ${Object.keys(BOOK_SIZES).join(", ")}`,
    });
  }

  // Verify user has access to family
  const access = await verifyFamilyAccess(auth.uid, familyId);
  if (!access) {
    return res.status(403).json({ error: "Access denied to this family" });
  }

  // Fetch pages
  const pages = await fetchPages(familyId, pageIds);

  if (pages.length === 0) {
    return res.status(400).json({
      error: pageIds
        ? "None of the specified pages were found"
        : "No locked pages found. Lock at least one page before compiling.",
    });
  }

  // Generate content hash
  const pagesHash = generateBookHash(
    familyId,
    pages.map((p) => ({ id: p.id, updatedAt: p.updatedAt })),
    bookSize
  );

  // Check for cached compilation (unless force recompile)
  if (!forceRecompile) {
    const cached = await findCachedCompilation(familyId, pagesHash, bookSize);
    if (cached && cached.r2Key) {
      return res.status(200).json({
        status: "cached",
        jobId: cached.id,
        totalPages: cached.totalPages,
        downloadUrl: cached.downloadUrl,
        message: "Using cached compilation. No changes detected since last compile.",
      });
    }
  }

  // Run bleed/safety zone validation
  const validationResult = validateBook(pages, bookSize);
  const warningRecord = createWarningRecord(validationResult);

  // If critical issues and not forced, return for user confirmation
  if (validationResult.shouldBlock && !req.body.acknowledgeWarnings) {
    return res.status(422).json({
      status: "validation_failed",
      message: validationResult.message,
      validation: {
        canProceed: false,
        summary: validationResult.summary,
        pageResults: validationResult.pageResults,
      },
      hint: "To proceed anyway, resend with acknowledgeWarnings: true",
    });
  }

  // Mark if user acknowledged warnings
  if (req.body.acknowledgeWarnings && warningRecord.summary.totalCritical > 0) {
    warningRecord.userProceeded = true;
    warningRecord.userProceededAt = new Date().toISOString();
    warningRecord.userProceededBy = auth.uid;
  }

  // Create compilation job
  const job = await createCompilationJob({
    familyId,
    createdBy: auth.uid,
    bookSize,
    pageIds: pages.map((p) => p.id),
    totalPages: pages.length,
    pagesHash,
    warningRecord,
    familyName: access.family.name,
  });

  // Estimate time (rough: ~5 seconds per page + merge overhead)
  const estimatedSeconds = pages.length * 5 + 30;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  return res.status(202).json({
    status: "pending",
    jobId: job.id,
    totalPages: pages.length,
    bookSize,
    estimatedMinutes,
    message: `Compilation started for ${pages.length} pages. Poll job status for progress.`,
    validation: {
      passed: validationResult.canProceed,
      summary: validationResult.summary,
      warnings: validationResult.summary.totalWarnings,
    },
  });
}

module.exports = {
  initializeCompilation,
  verifyFamilyAccess,
  fetchPages,
  createCompilationJob,
  findCachedCompilation,
};
