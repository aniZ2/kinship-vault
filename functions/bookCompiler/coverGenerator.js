/**
 * Cover PDF Generator for Lulu Print
 *
 * Generates a cover spread PDF containing:
 * - Back cover (left)
 * - Spine (center)
 * - Front cover (right)
 *
 * Supports three modes:
 * - "solid": Solid color background with text
 * - "front-image": Custom front cover image with solid back/spine
 * - "wraparound": Full wraparound image spanning entire cover
 */

const { PDFDocument, rgb } = require("pdf-lib");
const { getCoverDimensions } = require("./dimensions");
const { uploadPagePdf } = require("./r2Client");

/**
 * Fetch an image from URL and return as buffer
 */
async function fetchImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Detect image type from buffer
 */
function detectImageType(buffer) {
  // Check PNG signature
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  // Check JPEG signature
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "jpg";
  }
  // Default to jpg
  return "jpg";
}

/**
 * Parse hex color to RGB values (0-1 range)
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0.12, g: 0.23, b: 0.37 }; // Navy fallback
}

/**
 * Generate a cover PDF for Lulu printing
 *
 * @param {Object} options - Cover generation options
 * @param {string} options.familyId - Family ID
 * @param {string} options.familyName - Family name (displayed on cover)
 * @param {string} options.bookTitle - Book title (e.g., "2024 Yearbook")
 * @param {string} options.bookSize - Book size ('8x8', '10x10', '8.5x11')
 * @param {number} options.pageCount - Interior page count (for spine width)
 * @param {string} options.coverType - 'soft' or 'hard'
 * @param {string} options.paperType - 'standard' or 'premium'
 * @param {string} options.coverMode - 'solid', 'front-image', or 'wraparound'
 * @param {string} [options.primaryColor] - Primary/background color (hex)
 * @param {string} [options.secondaryColor] - Text color (hex)
 * @param {string} [options.frontCoverImageUrl] - URL for front cover image
 * @param {string} [options.wraparoundImageUrl] - URL for wraparound image
 * @returns {Promise<Object>} Cover PDF info { r2Key, pdfBuffer, dimensions }
 */
async function generateSimpleCover(options) {
  const {
    familyId,
    familyName = "Family",
    bookTitle,
    bookSize = "8x8",
    pageCount = 20,
    coverType = "soft",
    paperType = "standard",
    coverMode = "solid",
    primaryColor = "#1e3a5f",
    secondaryColor = "#ffffff",
    frontCoverImageUrl,
    wraparoundImageUrl,
  } = options;

  const dims = getCoverDimensions(bookSize, pageCount, paperType, coverType);
  const pdfDoc = await PDFDocument.create();

  // Create cover page with exact dimensions
  const coverPage = pdfDoc.addPage([dims.pdfWidth, dims.pdfHeight]);

  const bgColor = hexToRgb(primaryColor);
  const textColor = hexToRgb(secondaryColor);

  // Handle different cover modes
  if (coverMode === "wraparound" && wraparoundImageUrl) {
    // WRAPAROUND MODE: Single image spans entire cover
    try {
      console.log(`Fetching wraparound image: ${wraparoundImageUrl}`);
      const imageBuffer = await fetchImageBuffer(wraparoundImageUrl);
      const imageType = detectImageType(imageBuffer);

      let image;
      if (imageType === "png") {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        image = await pdfDoc.embedJpg(imageBuffer);
      }

      // Draw image to fill entire cover spread
      coverPage.drawImage(image, {
        x: 0,
        y: 0,
        width: dims.pdfWidth,
        height: dims.pdfHeight,
      });

      console.log("Wraparound cover image embedded successfully");
    } catch (err) {
      console.error("Failed to embed wraparound image:", err.message);
      // Fall back to solid color
      coverPage.drawRectangle({
        x: 0,
        y: 0,
        width: dims.pdfWidth,
        height: dims.pdfHeight,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }
  } else if (coverMode === "front-image" && frontCoverImageUrl) {
    // FRONT IMAGE MODE: Image on front, solid color on back/spine
    const { backCover, spine, frontCover } = dims.zones;

    // Draw back cover (solid color)
    coverPage.drawRectangle({
      x: 0,
      y: 0,
      width: backCover.width + spine.width,
      height: dims.pdfHeight,
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    });

    // Draw spine slightly darker
    coverPage.drawRectangle({
      x: spine.x,
      y: 0,
      width: spine.width,
      height: dims.pdfHeight,
      color: rgb(bgColor.r * 0.8, bgColor.g * 0.8, bgColor.b * 0.8),
    });

    // Draw front cover image
    try {
      console.log(`Fetching front cover image: ${frontCoverImageUrl}`);
      const imageBuffer = await fetchImageBuffer(frontCoverImageUrl);
      const imageType = detectImageType(imageBuffer);

      let image;
      if (imageType === "png") {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        image = await pdfDoc.embedJpg(imageBuffer);
      }

      // Draw image on front cover area
      coverPage.drawImage(image, {
        x: frontCover.x,
        y: 0,
        width: frontCover.width,
        height: dims.pdfHeight,
      });

      console.log("Front cover image embedded successfully");
    } catch (err) {
      console.error("Failed to embed front cover image:", err.message);
      // Fall back to solid color for front
      coverPage.drawRectangle({
        x: frontCover.x,
        y: 0,
        width: frontCover.width,
        height: dims.pdfHeight,
        color: rgb(bgColor.r, bgColor.g, bgColor.b),
      });
    }
  } else {
    // SOLID MODE: Solid color with text
    const { backCover, spine, frontCover } = dims.zones;

    // Fill entire background
    coverPage.drawRectangle({
      x: 0,
      y: 0,
      width: dims.pdfWidth,
      height: dims.pdfHeight,
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    });

    // Draw spine area slightly darker
    coverPage.drawRectangle({
      x: spine.x,
      y: 0,
      width: spine.width,
      height: dims.pdfHeight,
      color: rgb(bgColor.r * 0.8, bgColor.g * 0.8, bgColor.b * 0.8),
    });

    // Embed fonts for text
    const font = await pdfDoc.embedFont("Helvetica-Bold");
    const fontLight = await pdfDoc.embedFont("Helvetica");

    // Front cover text
    const titleFontSize = Math.min(72, frontCover.width / 10);
    const subtitleFontSize = titleFontSize * 0.5;

    // Draw family name on front cover
    const titleWidth = font.widthOfTextAtSize(familyName, titleFontSize);
    coverPage.drawText(familyName, {
      x: frontCover.x + (frontCover.width - titleWidth) / 2,
      y: dims.pdfHeight * 0.6,
      size: titleFontSize,
      font,
      color: rgb(textColor.r, textColor.g, textColor.b),
    });

    // Draw book title
    const title = bookTitle || `${new Date().getFullYear()} Yearbook`;
    const subtitleWidth = fontLight.widthOfTextAtSize(title, subtitleFontSize);
    coverPage.drawText(title, {
      x: frontCover.x + (frontCover.width - subtitleWidth) / 2,
      y: dims.pdfHeight * 0.45,
      size: subtitleFontSize,
      font: fontLight,
      color: rgb(textColor.r, textColor.g, textColor.b),
    });

    // Back cover - "Made with Kinship Vault" footer
    const footerText = "Made with Kinship Vault";
    const footerSize = 18;
    const footerWidth = fontLight.widthOfTextAtSize(footerText, footerSize);
    coverPage.drawText(footerText, {
      x: backCover.x + (backCover.width - footerWidth) / 2,
      y: 100,
      size: footerSize,
      font: fontLight,
      color: rgb(textColor.r, textColor.g, textColor.b, 0.7),
    });
  }

  // Set PDF metadata
  pdfDoc.setTitle(`${familyName} - Cover`);
  pdfDoc.setCreator("Kinship Vault");
  pdfDoc.setProducer("Kinship Vault Book Compiler");

  const pdfBuffer = await pdfDoc.save();

  // Generate R2 key
  const timestamp = Date.now().toString(36);
  const r2Key = `${familyId}/covers/cover-${bookSize}-${pageCount}p-${coverMode}-${timestamp}.pdf`;

  // Upload to R2
  await uploadPagePdf(r2Key, Buffer.from(pdfBuffer), {
    familyId,
    pageId: "cover",
    bookSize,
    pageCount,
    coverType,
    coverMode,
  });

  return {
    r2Key,
    pdfBuffer: Buffer.from(pdfBuffer),
    dimensions: dims,
    coverMode,
  };
}

// Legacy function kept for Puppeteer-based rendering (not used in Cloud Functions)
let puppeteer = null;
function getPuppeteer() {
  if (!puppeteer) {
    try {
      puppeteer = require("puppeteer");
    } catch (e) {
      throw new Error("Puppeteer is required for generateCoverPdf. Use generateSimpleCover instead.");
    }
  }
  return puppeteer;
}

async function generateCoverPdf(options) {
  // This function requires Puppeteer - use generateSimpleCover for Cloud Functions
  throw new Error("generateCoverPdf requires Puppeteer. Use generateSimpleCover instead.");
}

module.exports = {
  generateCoverPdf,
  generateSimpleCover,
  fetchImageBuffer,
  detectImageType,
  hexToRgb,
};
