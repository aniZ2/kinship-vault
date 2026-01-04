/**
 * Book Compiler Dimensions - LULU 2026 SOURCE OF TRUTH
 *
 * These are the EXACT pixel dimensions required by Lulu's pre-flight system.
 * DO NOT modify these values without verifying against Lulu's current specs.
 *
 * Lulu 2026 Print Specifications:
 * - Bleed: 0.125" on ALL sides (adds 0.25" to both width and height)
 * - Safety Margin: 0.5" (150px) - keep text/faces inside this
 * - DPI: 300 for print quality (achieved via deviceScaleFactor: 4.1666...)
 * - Page 1 starts on RIGHT side (odd = right, even = left)
 * - Gutter: +0.125" to +0.25" inside margin for books >60 pages
 *
 * Reference: Lulu 2026 Print Specs
 */

// Base DPI for screen rendering
const BASE_DPI = 72;

// Print DPI target
const PRINT_DPI = 300;

// Device scale factor to achieve 300 DPI from 72 DPI base
// 300 / 72 = 4.1666...
const DEVICE_SCALE_FACTOR = PRINT_DPI / BASE_DPI;

// Bleed area - content must extend here for full-bleed printing
const BLEED_INCHES = 0.125;

// Safety margin - critical content (faces, text) must stay INSIDE this
const SAFETY_MARGIN_INCHES = 0.5;

// Gutter recommendation for books over 60 pages (binding curve compensation)
const GUTTER_THRESHOLD_PAGES = 60;
const GUTTER_EXTRA_INCHES = 0.125; // to 0.25" depending on page count

/**
 * LULU COVER SPECIFICATIONS
 *
 * Cover PDF = Back Cover + Spine + Front Cover (as single spread)
 * Plus 0.125" bleed on all OUTER edges (not the spine)
 *
 * Spine width formula (Lulu 2026):
 * - Standard 80# paper: 0.002252" per page
 * - Premium paper: 0.0025" per page
 *
 * Cover wrap (hardcover only): 0.75" on each side
 */
const SPINE_WIDTH_PER_PAGE = {
  standard: 0.002252, // inches per page for 80# paper
  premium: 0.0025,    // inches per page for premium paper
};

// Hardcover wrap allowance (extra material that wraps around board)
const HARDCOVER_WRAP_INCHES = 0.75;

/**
 * Convert inches to pixels at given DPI
 */
function inchesToPx(inches, dpi = BASE_DPI) {
  return Math.round(inches * dpi);
}

/**
 * LULU 2026 MASTER DIMENSIONS - HARDCODED SOURCE OF TRUTH
 *
 * These exact pixel values prevent Lulu's pre-flight from rejecting PDFs.
 * Calculated from: (trim + 0.25" bleed) × 300 DPI
 *
 * | Trim Size   | PDF with Bleed (in) | PDF Size (300 DPI)  |
 * |-------------|---------------------|---------------------|
 * | 8x8         | 8.25" × 8.25"       | 2475 × 2475 px      |
 * | 10x10       | 10.25" × 10.25"     | 3075 × 3075 px      |
 * | 8.5x11      | 8.75" × 11.25"      | 2625 × 3375 px      |
 */
const BOOK_SIZES = {
  "8x8": {
    name: "8×8 Square",
    trimWidth: 8,
    trimHeight: 8,
    // Base dimensions at 72 DPI (for Puppeteer viewport)
    basePx: {
      width: 576,   // 8 × 72
      height: 576,  // 8 × 72
    },
    // Trim dimensions at 300 DPI (where blade cuts)
    printPx: {
      width: 2400,  // 8 × 300
      height: 2400, // 8 × 300
    },
    // LULU SOURCE OF TRUTH: PDF dimensions WITH bleed
    withBleedPx: {
      width: 2475,  // 8.25 × 300 - EXACT LULU SPEC
      height: 2475, // 8.25 × 300 - EXACT LULU SPEC
    },
  },
  "10x10": {
    name: "10×10 Square",
    trimWidth: 10,
    trimHeight: 10,
    basePx: {
      width: 720,   // 10 × 72
      height: 720,  // 10 × 72
    },
    printPx: {
      width: 3000,  // 10 × 300
      height: 3000, // 10 × 300
    },
    // LULU SOURCE OF TRUTH: PDF dimensions WITH bleed
    withBleedPx: {
      width: 3075,  // 10.25 × 300 - EXACT LULU SPEC
      height: 3075, // 10.25 × 300 - EXACT LULU SPEC
    },
  },
  "8.5x11": {
    name: "8.5×11 Portrait",
    trimWidth: 8.5,
    trimHeight: 11,
    basePx: {
      width: 612,   // 8.5 × 72
      height: 792,  // 11 × 72
    },
    printPx: {
      width: 2550,  // 8.5 × 300
      height: 3300, // 11 × 300
    },
    // LULU SOURCE OF TRUTH: PDF dimensions WITH bleed
    withBleedPx: {
      width: 2625,  // 8.75 × 300 - EXACT LULU SPEC
      height: 3375, // 11.25 × 300 - EXACT LULU SPEC
    },
  },
};

/**
 * MARGIN CONSTANTS - Hardcoded for precision
 */
const MARGINS = {
  bleed: {
    inches: BLEED_INCHES,
    px72: 9,    // 0.125 × 72 = 9
    px300: 38,  // 0.125 × 300 = 37.5, rounded to 38
  },
  safety: {
    inches: SAFETY_MARGIN_INCHES,
    px72: 36,   // 0.5 × 72 = 36
    px300: 150, // 0.5 × 300 = 150 - EXACT LULU SPEC
  },
  gutter: {
    inches: GUTTER_EXTRA_INCHES,
    px300: 38,  // 0.125 × 300 = 37.5, rounded to 38
    thresholdPages: GUTTER_THRESHOLD_PAGES,
  },
};

/**
 * Get full page dimensions including bleed area
 * @param {string} bookSize - '8x8' | '10x10' | '8.5x11'
 * @param {boolean} includeBleed - Whether to add bleed margins
 * @param {number} pageCount - Total pages (for gutter calculation)
 * @returns {Object} Dimension specifications
 */
function getPageDimensions(bookSize, includeBleed = true, pageCount = 0) {
  const size = BOOK_SIZES[bookSize];
  if (!size) {
    throw new Error(`Invalid book size: ${bookSize}. Valid: ${Object.keys(BOOK_SIZES).join(", ")}`);
  }

  const bleedPx = includeBleed ? MARGINS.bleed.px300 : 0;

  // Gutter adjustment for thick books (>60 pages)
  const needsGutter = pageCount > MARGINS.gutter.thresholdPages;
  const gutterPx = needsGutter ? MARGINS.gutter.px300 : 0;

  return {
    // Puppeteer viewport (base size at 72 DPI)
    viewport: {
      width: size.basePx.width + (includeBleed ? MARGINS.bleed.px72 * 2 : 0),
      height: size.basePx.height + (includeBleed ? MARGINS.bleed.px72 * 2 : 0),
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    },
    // Final output dimensions at 300 DPI - USE HARDCODED LULU VALUES
    output: includeBleed
      ? { width: size.withBleedPx.width, height: size.withBleedPx.height }
      : { width: size.printPx.width, height: size.printPx.height },
    // Trim box (where the blade cuts)
    trimBox: {
      x: bleedPx,
      y: bleedPx,
      width: size.printPx.width,
      height: size.printPx.height,
    },
    // Safety zone (critical content must stay inside)
    // For thick books, the inside (gutter) margin is larger
    safetyBox: {
      x: bleedPx + MARGINS.safety.px300,
      y: bleedPx + MARGINS.safety.px300,
      width: size.printPx.width - MARGINS.safety.px300 * 2,
      height: size.printPx.height - MARGINS.safety.px300 * 2,
    },
    // Gutter info (for books >60 pages)
    gutter: {
      needed: needsGutter,
      insideMarginPx: MARGINS.safety.px300 + gutterPx,
      recommendation: needsGutter
        ? `Add ${GUTTER_EXTRA_INCHES}" to inside margin for ${pageCount}-page book`
        : null,
    },
  };
}

/**
 * Check if a coordinate is within the safety zone
 * Used to validate that faces/text won't be cut off
 *
 * @param {number} x - Item X position (at 300 DPI)
 * @param {number} y - Item Y position (at 300 DPI)
 * @param {number} width - Item width (at 300 DPI)
 * @param {number} height - Item height (at 300 DPI)
 * @param {string} bookSize - Book size key
 * @returns {Object} { safe: boolean, violations: string[] }
 */
function checkSafetyZone(x, y, width, height, bookSize) {
  const dims = getPageDimensions(bookSize);
  const safe = dims.safetyBox;
  const violations = [];

  // Check each edge
  if (x < safe.x) {
    violations.push(`left edge (${x}px < ${safe.x}px safety margin)`);
  }
  if (y < safe.y) {
    violations.push(`top edge (${y}px < ${safe.y}px safety margin)`);
  }
  if (x + width > safe.x + safe.width) {
    violations.push(`right edge (${x + width}px > ${safe.x + safe.width}px safety margin)`);
  }
  if (y + height > safe.y + safe.height) {
    violations.push(`bottom edge (${y + height}px > ${safe.y + safe.height}px safety margin)`);
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Scale editor coordinates from 72 DPI to 300 DPI
 * @param {number} value - Coordinate or dimension at 72 DPI
 * @returns {number} Value at 300 DPI
 */
function scaleToprint(value) {
  return Math.round(value * DEVICE_SCALE_FACTOR);
}

/**
 * Scale editor coordinates from 300 DPI to 72 DPI
 * @param {number} value - Coordinate or dimension at 300 DPI
 * @returns {number} Value at 72 DPI
 */
function scaleToBase(value) {
  return Math.round(value / DEVICE_SCALE_FACTOR);
}

/**
 * Calculate cover dimensions for Lulu print
 *
 * Cover is a single PDF spread: Back Cover + Spine + Front Cover
 * With 0.125" bleed on outer edges only.
 *
 * @param {string} bookSize - Book size key ('8x8', '10x10', '8.5x11')
 * @param {number} pageCount - Total interior pages (affects spine width)
 * @param {string} paperType - 'standard' or 'premium'
 * @param {string} coverType - 'soft' or 'hard'
 * @returns {Object} Cover dimensions and layout info
 */
function getCoverDimensions(bookSize, pageCount, paperType = "standard", coverType = "soft") {
  const size = BOOK_SIZES[bookSize];
  if (!size) {
    throw new Error(`Invalid book size: ${bookSize}`);
  }

  // Calculate spine width based on page count
  const spineWidthPerPage = SPINE_WIDTH_PER_PAGE[paperType] || SPINE_WIDTH_PER_PAGE.standard;
  const spineWidthInches = pageCount * spineWidthPerPage;
  const spineWidthPx = Math.round(spineWidthInches * PRINT_DPI);

  // Hardcover needs extra wrap allowance
  const wrapInches = coverType === "hard" ? HARDCOVER_WRAP_INCHES : 0;
  const wrapPx = Math.round(wrapInches * PRINT_DPI);

  // Cover dimensions (without bleed)
  // Width = Back + Spine + Front (+ wrap on each side for hardcover)
  const coverWidthInches = size.trimWidth + spineWidthInches + size.trimWidth + (wrapInches * 2);
  const coverHeightInches = size.trimHeight + (wrapInches * 2);

  // With bleed (0.125" on outer edges)
  const totalWidthInches = coverWidthInches + (BLEED_INCHES * 2);
  const totalHeightInches = coverHeightInches + (BLEED_INCHES * 2);

  const bleedPx = MARGINS.bleed.px300;

  return {
    // Final PDF dimensions at 300 DPI
    pdfWidth: Math.round(totalWidthInches * PRINT_DPI),
    pdfHeight: Math.round(totalHeightInches * PRINT_DPI),

    // Dimensions in inches (for reference)
    inches: {
      totalWidth: totalWidthInches,
      totalHeight: totalHeightInches,
      coverWidth: coverWidthInches,
      coverHeight: coverHeightInches,
      spineWidth: spineWidthInches,
      wrapWidth: wrapInches,
    },

    // Layout zones at 300 DPI (for positioning content)
    zones: {
      // Bleed area (outer edge that gets trimmed)
      bleed: bleedPx,

      // Back cover area (left side)
      backCover: {
        x: bleedPx + wrapPx,
        y: bleedPx + wrapPx,
        width: size.printPx.width,
        height: size.printPx.height,
      },

      // Spine area (center)
      spine: {
        x: bleedPx + wrapPx + size.printPx.width,
        y: bleedPx + wrapPx,
        width: spineWidthPx,
        height: size.printPx.height,
      },

      // Front cover area (right side)
      frontCover: {
        x: bleedPx + wrapPx + size.printPx.width + spineWidthPx,
        y: bleedPx + wrapPx,
        width: size.printPx.width,
        height: size.printPx.height,
      },

      // Safety zone for text/important content (0.5" from trim on all sides)
      safety: {
        backCover: {
          x: bleedPx + wrapPx + MARGINS.safety.px300,
          y: bleedPx + wrapPx + MARGINS.safety.px300,
          width: size.printPx.width - (MARGINS.safety.px300 * 2),
          height: size.printPx.height - (MARGINS.safety.px300 * 2),
        },
        spine: {
          x: bleedPx + wrapPx + size.printPx.width + Math.round(spineWidthPx * 0.1),
          y: bleedPx + wrapPx + MARGINS.safety.px300,
          width: Math.round(spineWidthPx * 0.8),
          height: size.printPx.height - (MARGINS.safety.px300 * 2),
        },
        frontCover: {
          x: bleedPx + wrapPx + size.printPx.width + spineWidthPx + MARGINS.safety.px300,
          y: bleedPx + wrapPx + MARGINS.safety.px300,
          width: size.printPx.width - (MARGINS.safety.px300 * 2),
          height: size.printPx.height - (MARGINS.safety.px300 * 2),
        },
      },
    },

    // Metadata
    pageCount,
    paperType,
    coverType,
    bookSize,
  };
}

module.exports = {
  BASE_DPI,
  PRINT_DPI,
  DEVICE_SCALE_FACTOR,
  BLEED_INCHES,
  SAFETY_MARGIN_INCHES,
  GUTTER_THRESHOLD_PAGES,
  GUTTER_EXTRA_INCHES,
  SPINE_WIDTH_PER_PAGE,
  HARDCOVER_WRAP_INCHES,
  BOOK_SIZES,
  MARGINS,
  getPageDimensions,
  getCoverDimensions,
  checkSafetyZone,
  scaleToprint,
  scaleToBase,
  inchesToPx,
};
