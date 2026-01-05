/**
 * End-to-End Test Script for Book Compiler Flow
 *
 * Tests the complete compilation pipeline:
 * 1. Find a family with locked pages
 * 2. Initialize compilation
 * 3. Monitor job progress
 * 4. Verify final PDF download URL
 *
 * Usage: node scripts/test-book-compiler.js [familyId] [bookSize]
 */

const admin = require('../functions/node_modules/firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'kinshipvault-47ad0'
});

const db = admin.firestore();

// Configuration
const BOOK_SIZE = process.argv[3] || '8x8';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3 minutes max

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  console.log(`\n${colors.cyan}[Step ${step}]${colors.reset} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function logError(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function logInfo(msg) {
  console.log(`${colors.dim}  ${msg}${colors.reset}`);
}

/**
 * Find a family with locked pages for testing
 */
async function findTestFamily(specificFamilyId = null) {
  if (specificFamilyId) {
    const famDoc = await db.collection('families').doc(specificFamilyId).get();
    if (!famDoc.exists) {
      throw new Error(`Family ${specificFamilyId} not found`);
    }

    const pages = await db.collection('families').doc(specificFamilyId)
      .collection('pages')
      .where('isLocked', '==', true)
      .limit(20)
      .get();

    return {
      familyId: specificFamilyId,
      familyName: famDoc.data().name,
      lockedPages: pages.docs.map(p => ({ id: p.id, ...p.data() })),
    };
  }

  // Search for any family with locked pages
  const families = await db.collection('families').limit(20).get();

  for (const fam of families.docs) {
    const pages = await db.collection('families').doc(fam.id)
      .collection('pages')
      .where('isLocked', '==', true)
      .limit(20)
      .get();

    if (!pages.empty) {
      return {
        familyId: fam.id,
        familyName: fam.data().name,
        lockedPages: pages.docs.map(p => ({ id: p.id, ...p.data() })),
      };
    }
  }

  throw new Error('No families with locked pages found');
}

/**
 * Create a compilation job directly in Firestore (simulating the Cloud Function)
 */
async function createTestCompilationJob(familyId, familyName, pageIds, bookSize) {
  const crypto = require('crypto');
  const pagesHash = crypto.createHash('sha256')
    .update(familyId + pageIds.join(',') + bookSize + Date.now())
    .digest('hex')
    .substring(0, 16);

  const jobData = {
    familyId,
    familyName,
    createdBy: 'test-script',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    bookSize,
    bleedInches: 0.125,
    pageIds,
    status: 'pending',
    pagesRendered: 0,
    totalPages: pageIds.length,
    currentBatch: 0,
    pagesHash,
    bleedValidation: {
      validated: true,
      summary: { totalPages: pageIds.length, totalWarnings: 0, totalCritical: 0 },
    },
    r2Key: null,
    downloadUrl: null,
    downloadExpiresAt: null,
    fileSizeBytes: null,
    errorMessage: null,
    failedPageId: null,
  };

  const ref = await db.collection('families').doc(familyId)
    .collection('compilationJobs')
    .add(jobData);

  return { id: ref.id, ...jobData };
}

/**
 * Poll job status until complete or failed
 */
async function pollJobStatus(familyId, jobId) {
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts++;

    const jobDoc = await db.collection('families').doc(familyId)
      .collection('compilationJobs').doc(jobId).get();

    if (!jobDoc.exists) {
      throw new Error('Job document disappeared');
    }

    const job = jobDoc.data();
    const progress = job.totalPages > 0
      ? Math.round((job.pagesRendered / job.totalPages) * 100)
      : 0;

    // Log progress
    process.stdout.write(`\r  Status: ${job.status.padEnd(12)} | Progress: ${progress}% (${job.pagesRendered}/${job.totalPages} pages) | Attempt ${attempts}/${MAX_POLL_ATTEMPTS}`);

    if (job.status === 'complete') {
      console.log(); // New line
      return job;
    }

    if (job.status === 'failed') {
      console.log(); // New line
      throw new Error(`Compilation failed: ${job.errorMessage || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Polling timeout - job did not complete in time');
}

/**
 * Verify the completed job
 */
async function verifyCompletedJob(job) {
  const checks = [
    { name: 'Status is complete', pass: job.status === 'complete' },
    { name: 'Has R2 key', pass: !!job.r2Key },
    { name: 'Has download URL', pass: !!job.downloadUrl },
    { name: 'Has file size', pass: job.fileSizeBytes > 0 },
    { name: 'All pages rendered', pass: job.pagesRendered === job.totalPages },
  ];

  console.log('\n  Verification Results:');
  let allPassed = true;

  for (const check of checks) {
    if (check.pass) {
      logSuccess(check.name);
    } else {
      logError(check.name);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Check for existing recent jobs
 */
async function findExistingJob(familyId) {
  const oneHourAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 60 * 60 * 1000)
  );

  const snapshot = await db.collection('families').doc(familyId)
    .collection('compilationJobs')
    .where('createdAt', '>=', oneHourAgo)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  return null;
}

/**
 * Main test function
 */
async function runTest() {
  console.log('\n' + '='.repeat(60));
  console.log('  BOOK COMPILER END-TO-END TEST');
  console.log('='.repeat(60));

  const startTime = Date.now();
  const specificFamilyId = process.argv[2];

  try {
    // Step 1: Find test family
    logStep(1, 'Finding test family with locked pages...');
    const testFamily = await findTestFamily(specificFamilyId);
    logSuccess(`Found family: ${testFamily.familyName}`);
    logInfo(`Family ID: ${testFamily.familyId}`);
    logInfo(`Locked pages: ${testFamily.lockedPages.length}`);

    if (testFamily.lockedPages.length === 0) {
      throw new Error('No locked pages found in this family');
    }

    // List pages
    console.log('\n  Pages to compile:');
    testFamily.lockedPages.slice(0, 5).forEach((p, i) => {
      logInfo(`${i + 1}. ${p.title || '(untitled)'} [${p.id}]`);
    });
    if (testFamily.lockedPages.length > 5) {
      logInfo(`... and ${testFamily.lockedPages.length - 5} more`);
    }

    // Step 2: Check for existing job or create new one
    logStep(2, 'Checking for existing compilation job...');
    let job = await findExistingJob(testFamily.familyId);

    if (job && job.status === 'complete') {
      logSuccess('Found existing completed job');
      logInfo(`Job ID: ${job.id}`);
      logInfo(`Created: ${job.createdAt?.toDate?.()?.toISOString() || 'unknown'}`);
    } else if (job && ['pending', 'rendering', 'merging'].includes(job.status)) {
      logSuccess('Found in-progress job, will monitor it');
      logInfo(`Job ID: ${job.id}`);
      logInfo(`Current status: ${job.status}`);
    } else {
      log('No recent job found, creating new compilation job...', 'yellow');

      const pageIds = testFamily.lockedPages.map(p => p.id);
      job = await createTestCompilationJob(
        testFamily.familyId,
        testFamily.familyName,
        pageIds,
        BOOK_SIZE
      );

      logSuccess('Compilation job created');
      logInfo(`Job ID: ${job.id}`);
      logInfo(`Book size: ${BOOK_SIZE}`);
      logInfo(`Total pages: ${pageIds.length}`);
    }

    // Step 3: Poll for completion (if not already complete)
    if (job.status !== 'complete') {
      logStep(3, 'Monitoring compilation progress...');
      log('  (This may take several minutes for large books)', 'dim');
      console.log();

      job = await pollJobStatus(testFamily.familyId, job.id);
      logSuccess('Compilation completed!');
    } else {
      logStep(3, 'Skipping monitoring (job already complete)');
    }

    // Step 4: Verify results
    logStep(4, 'Verifying compilation results...');
    const verified = await verifyCompletedJob(job);

    // Summary
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log('\n' + '='.repeat(60));

    if (verified) {
      log('  TEST PASSED ✓', 'green');
      console.log('='.repeat(60));
      console.log(`\n  Duration: ${duration}s`);
      console.log(`  Family: ${testFamily.familyName}`);
      console.log(`  Pages: ${job.totalPages}`);
      console.log(`  Book size: ${job.bookSize}`);
      console.log(`  File size: ${(job.fileSizeBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  R2 Key: ${job.r2Key}`);
      console.log(`\n  Download URL (expires in 1 hour):`);
      console.log(`  ${job.downloadUrl?.substring(0, 100)}...`);
    } else {
      log('  TEST FAILED ✗', 'red');
      console.log('='.repeat(60));
    }

    console.log();
    process.exit(verified ? 0 : 1);

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log('  TEST FAILED ✗', 'red');
    console.log('='.repeat(60));
    console.log(`\n  Error: ${error.message}`);
    console.log();
    process.exit(1);
  }
}

// Run the test
runTest();
