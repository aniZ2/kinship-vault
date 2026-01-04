/**
 * Bleed & Safety Zone Validation
 *
 * CRITICAL: Warnings are ALWAYS persisted to the CompilationJob document,
 * even when the user proceeds. This creates traceable "structural linting results"
 * for support, reprints, and legal defensibility.
 *
 * Two zones to check:
 * 1. Safety Zone (0.5"): Critical content (faces, text) must stay INSIDE
 * 2. Bleed Zone (0.125"): Content must EXTEND here for full-bleed printing
 */

const {
  MARGINS,
  DEVICE_SCALE_FACTOR,
  getPageDimensions,
} = require("./dimensions");

/**
 * Warning severity levels
 */
const SEVERITY = {
  CRITICAL: "critical", // Content will likely be cut off (in bleed zone)
  WARNING: "warning", // Content may be affected (in safety margin)
  INFO: "info", // Minor issue, likely fine
};

/**
 * Check if an item's content is at risk of being cut off
 *
 * @param {Object} item - EditorItem from page state
 * @param {string} bookSize - '8x8' | '10x10' | '8.5x11'
 * @param {number} canvasWidth - Canvas width at 72 DPI
 * @param {number} canvasHeight - Canvas height at 72 DPI
 * @returns {Object} Validation result with warnings
 */
function validateItem(item, bookSize, canvasWidth, canvasHeight) {
  const dims = getPageDimensions(bookSize);
  const warnings = [];

  // Scale item coordinates from editor (72 DPI) to print (300 DPI)
  const itemAt300 = {
    x: Math.round(item.x * DEVICE_SCALE_FACTOR),
    y: Math.round(item.y * DEVICE_SCALE_FACTOR),
    width: Math.round(item.width * DEVICE_SCALE_FACTOR),
    height: Math.round(item.height * DEVICE_SCALE_FACTOR),
  };

  // Get bounding box edges
  const edges = {
    left: itemAt300.x,
    top: itemAt300.y,
    right: itemAt300.x + itemAt300.width,
    bottom: itemAt300.y + itemAt300.height,
  };

  // Safety zone boundaries (content should stay INSIDE these)
  const safetyZone = dims.safetyBox;

  // Check each edge against safety zone
  if (edges.left < safetyZone.x) {
    const distance = safetyZone.x - edges.left;
    warnings.push({
      edge: "left",
      severity: distance > MARGINS.safety.px300 / 2 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      message: `Left edge is ${Math.round(distance / DEVICE_SCALE_FACTOR)}px into the safety margin`,
      distancePx: distance,
    });
  }

  if (edges.top < safetyZone.y) {
    const distance = safetyZone.y - edges.top;
    warnings.push({
      edge: "top",
      severity: distance > MARGINS.safety.px300 / 2 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      message: `Top edge is ${Math.round(distance / DEVICE_SCALE_FACTOR)}px into the safety margin`,
      distancePx: distance,
    });
  }

  if (edges.right > safetyZone.x + safetyZone.width) {
    const distance = edges.right - (safetyZone.x + safetyZone.width);
    warnings.push({
      edge: "right",
      severity: distance > MARGINS.safety.px300 / 2 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      message: `Right edge is ${Math.round(distance / DEVICE_SCALE_FACTOR)}px into the safety margin`,
      distancePx: distance,
    });
  }

  if (edges.bottom > safetyZone.y + safetyZone.height) {
    const distance = edges.bottom - (safetyZone.y + safetyZone.height);
    warnings.push({
      edge: "bottom",
      severity: distance > MARGINS.safety.px300 / 2 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      message: `Bottom edge is ${Math.round(distance / DEVICE_SCALE_FACTOR)}px into the safety margin`,
      distancePx: distance,
    });
  }

  return {
    itemId: item.id,
    itemType: item.type,
    hasWarnings: warnings.length > 0,
    hasCritical: warnings.some((w) => w.severity === SEVERITY.CRITICAL),
    warnings,
  };
}

/**
 * Validate all items on a page for bleed/safety zone violations
 *
 * @param {Object} pageState - EditorState with items array
 * @param {string} bookSize - '8x8' | '10x10' | '8.5x11'
 * @returns {Object} Page validation result
 */
function validatePage(pageState, bookSize) {
  if (!pageState || !pageState.items || !Array.isArray(pageState.items)) {
    return {
      valid: true,
      warnings: [],
      itemWarnings: [],
      summary: { total: 0, critical: 0, warning: 0 },
    };
  }

  // Get base canvas dimensions for this book size
  const dims = getPageDimensions(bookSize, false);
  const canvasWidth = dims.viewport.width;
  const canvasHeight = dims.viewport.height;

  const itemWarnings = [];
  let criticalCount = 0;
  let warningCount = 0;

  for (const item of pageState.items) {
    // Skip items without position/size
    if (typeof item.x !== "number" || typeof item.width !== "number") {
      continue;
    }

    const result = validateItem(item, bookSize, canvasWidth, canvasHeight);

    if (result.hasWarnings) {
      itemWarnings.push(result);
      if (result.hasCritical) {
        criticalCount++;
      } else {
        warningCount++;
      }
    }
  }

  return {
    valid: criticalCount === 0,
    warnings: itemWarnings.flatMap((iw) => iw.warnings),
    itemWarnings,
    summary: {
      total: itemWarnings.length,
      critical: criticalCount,
      warning: warningCount,
    },
  };
}

/**
 * Validate all pages in a compilation job
 *
 * IMPORTANT: This function ALWAYS returns warnings for ALL pages,
 * even when they pass validation. These warnings are persisted
 * to the CompilationJob document for traceability.
 *
 * @param {Array} pages - Array of { id, state } page objects
 * @param {string} bookSize - '8x8' | '10x10' | '8.5x11'
 * @returns {Object} Full validation result with persistent warnings
 */
function validateBook(pages, bookSize) {
  const pageResults = [];
  let totalCritical = 0;
  let totalWarnings = 0;
  const criticalPageIds = [];

  for (const page of pages) {
    const result = validatePage(page.state, bookSize);

    // ALWAYS include the result, even if empty (for traceability)
    pageResults.push({
      pageId: page.id,
      pageTitle: page.title || `Page ${page.id}`,
      validatedAt: new Date().toISOString(),
      ...result,
    });

    totalCritical += result.summary.critical;
    totalWarnings += result.summary.warning;

    if (result.summary.critical > 0) {
      criticalPageIds.push(page.id);
    }
  }

  return {
    // Can proceed if no critical issues
    canProceed: totalCritical === 0,
    // Block compilation if critical issues exist
    shouldBlock: totalCritical > 0,
    // Summary for quick checks
    summary: {
      pagesChecked: pages.length,
      pagesWithIssues: pageResults.filter((p) => p.summary.total > 0).length,
      totalCritical,
      totalWarnings,
      criticalPageIds,
    },
    // ALWAYS persist this for artifact history
    pageResults,
    // Human-readable message
    message: totalCritical > 0
      ? `${totalCritical} critical issue(s) found. Content may be cut off during printing.`
      : totalWarnings > 0
        ? `${totalWarnings} warning(s) found. Content is close to edges but should print OK.`
        : "All pages passed safety zone validation.",
  };
}

/**
 * Generate a persistent warning record for the CompilationJob document
 *
 * This is the format stored in Firestore for long-term traceability.
 * Support staff can reference this months later for reprint issues.
 *
 * @param {Object} validationResult - Result from validateBook()
 * @returns {Object} Firestore-ready warning record
 */
function createWarningRecord(validationResult) {
  return {
    // Timestamp for when validation occurred
    validatedAt: new Date().toISOString(),
    // Overall result
    passed: validationResult.canProceed,
    userProceeded: false, // Set to true when user acknowledges and continues
    // Summary stats
    summary: validationResult.summary,
    // Per-page details (always included, even if empty)
    pages: validationResult.pageResults.map((pr) => ({
      pageId: pr.pageId,
      pageTitle: pr.pageTitle,
      validatedAt: pr.validatedAt,
      itemsWithIssues: pr.itemWarnings.length,
      criticalCount: pr.summary.critical,
      warningCount: pr.summary.warning,
      // Only include detailed warnings if there are issues (reduces document size)
      details: pr.itemWarnings.length > 0 ? pr.itemWarnings : undefined,
    })),
    // Human-readable summary
    message: validationResult.message,
  };
}

/**
 * Mark that user acknowledged warnings and proceeded anyway
 *
 * @param {Object} warningRecord - Existing warning record
 * @param {string} userId - UID of user who acknowledged
 * @returns {Object} Updated warning record
 */
function markUserProceeded(warningRecord, userId) {
  return {
    ...warningRecord,
    userProceeded: true,
    userProceededAt: new Date().toISOString(),
    userProceededBy: userId,
  };
}

module.exports = {
  SEVERITY,
  validateItem,
  validatePage,
  validateBook,
  createWarningRecord,
  markUserProceeded,
};
