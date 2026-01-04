// src/app/render/cover/[familyId]/page.tsx
// Cover render route for Puppeteer screenshot
// This page renders a book cover spread (Back + Spine + Front)

import { Suspense } from "react";

// Lulu 2026 cover specs
const SPINE_WIDTH_PER_PAGE = {
  standard: 0.002252,
  premium: 0.0025,
};

const HARDCOVER_WRAP_INCHES = 0.75;
const BLEED_INCHES = 0.125;
const PRINT_DPI = 300;

const BOOK_SIZES: Record<string, { trimWidth: number; trimHeight: number }> = {
  "8x8": { trimWidth: 8, trimHeight: 8 },
  "10x10": { trimWidth: 10, trimHeight: 10 },
  "8.5x11": { trimWidth: 8.5, trimHeight: 11 },
};

interface CoverDimensions {
  pdfWidth: number;
  pdfHeight: number;
  spineWidthPx: number;
  coverWidthPx: number;
  coverHeightPx: number;
  bleedPx: number;
  wrapPx: number;
}

function getCoverDimensions(
  bookSize: string,
  pageCount: number,
  paperType: string,
  coverType: string
): CoverDimensions {
  const size = BOOK_SIZES[bookSize] || BOOK_SIZES["8x8"];

  const spineWidthPerPage =
    SPINE_WIDTH_PER_PAGE[paperType as keyof typeof SPINE_WIDTH_PER_PAGE] ||
    SPINE_WIDTH_PER_PAGE.standard;
  const spineWidthInches = pageCount * spineWidthPerPage;
  const spineWidthPx = Math.round(spineWidthInches * PRINT_DPI);

  const wrapInches = coverType === "hard" ? HARDCOVER_WRAP_INCHES : 0;
  const wrapPx = Math.round(wrapInches * PRINT_DPI);

  const coverWidthInches =
    size.trimWidth + spineWidthInches + size.trimWidth + wrapInches * 2;
  const coverHeightInches = size.trimHeight + wrapInches * 2;

  const totalWidthInches = coverWidthInches + BLEED_INCHES * 2;
  const totalHeightInches = coverHeightInches + BLEED_INCHES * 2;

  const bleedPx = Math.round(BLEED_INCHES * PRINT_DPI);

  return {
    pdfWidth: Math.round(totalWidthInches * PRINT_DPI),
    pdfHeight: Math.round(totalHeightInches * PRINT_DPI),
    spineWidthPx,
    coverWidthPx: Math.round(size.trimWidth * PRINT_DPI),
    coverHeightPx: Math.round(size.trimHeight * PRINT_DPI),
    bleedPx,
    wrapPx,
  };
}

interface PageProps {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{
    bookSize?: string;
    pageCount?: string;
    coverType?: string;
    paperType?: string;
    familyName?: string;
    bookTitle?: string;
    primaryColor?: string;
    secondaryColor?: string;
    frontImage?: string;
    backImage?: string;
  }>;
}

export default async function CoverRenderPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const familyId = resolvedParams.familyId;
  const bookSize = resolvedSearchParams.bookSize || "8x8";
  const pageCount = parseInt(resolvedSearchParams.pageCount || "20", 10);
  const coverType = resolvedSearchParams.coverType || "soft";
  const paperType = resolvedSearchParams.paperType || "standard";
  const familyName = resolvedSearchParams.familyName || "Family";
  const bookTitle = resolvedSearchParams.bookTitle || `${new Date().getFullYear()} Yearbook`;
  const primaryColor = resolvedSearchParams.primaryColor || "#1e3a5f";
  const secondaryColor = resolvedSearchParams.secondaryColor || "#ffffff";
  const frontImage = resolvedSearchParams.frontImage;
  const backImage = resolvedSearchParams.backImage;

  const dims = getCoverDimensions(bookSize, pageCount, paperType, coverType);

  // Scale factor for rendering (we render at 72 DPI base, Puppeteer upscales)
  const scale = 72 / PRINT_DPI;
  const width = dims.pdfWidth * scale;
  const height = dims.pdfHeight * scale;
  const bleed = dims.bleedPx * scale;
  const wrap = dims.wrapPx * scale;
  const coverW = dims.coverWidthPx * scale;
  const coverH = dims.coverHeightPx * scale;
  const spineW = dims.spineWidthPx * scale;

  return (
    <Suspense fallback={<div>Loading cover...</div>}>
      <div
        data-cover-ready
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: "relative",
          overflow: "hidden",
          backgroundColor: primaryColor,
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        }}
      >
        {/* Bleed area indicator (for debugging - remove in production) */}
        {/* <div style={{ position: 'absolute', inset: 0, border: `${bleed}px solid rgba(255,0,0,0.2)`, pointerEvents: 'none', zIndex: 100 }} /> */}

        {/* Back Cover */}
        <div
          style={{
            position: "absolute",
            left: `${bleed + wrap}px`,
            top: `${bleed + wrap}px`,
            width: `${coverW}px`,
            height: `${coverH}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
            backgroundImage: backImage ? `url(${backImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!backImage && (
            <div
              style={{
                position: "absolute",
                bottom: "30px",
                color: secondaryColor,
                opacity: 0.6,
                fontSize: "10px",
                textAlign: "center",
              }}
            >
              Made with Kinship Vault
            </div>
          )}
        </div>

        {/* Spine */}
        <div
          style={{
            position: "absolute",
            left: `${bleed + wrap + coverW}px`,
            top: `${bleed + wrap}px`,
            width: `${spineW}px`,
            height: `${coverH}px`,
            backgroundColor: adjustColor(primaryColor, -20),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {spineW > 15 && (
            <div
              style={{
                transform: "rotate(-90deg)",
                whiteSpace: "nowrap",
                color: secondaryColor,
                fontSize: `${Math.min(spineW * 0.6, 12)}px`,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {familyName}
            </div>
          )}
        </div>

        {/* Front Cover */}
        <div
          style={{
            position: "absolute",
            left: `${bleed + wrap + coverW + spineW}px`,
            top: `${bleed + wrap}px`,
            width: `${coverW}px`,
            height: `${coverH}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
            backgroundImage: frontImage ? `url(${frontImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!frontImage && (
            <>
              {/* Decorative element */}
              <div
                style={{
                  width: "60px",
                  height: "4px",
                  backgroundColor: secondaryColor,
                  opacity: 0.5,
                  marginBottom: "20px",
                  borderRadius: "2px",
                }}
              />

              {/* Family name */}
              <h1
                style={{
                  margin: 0,
                  color: secondaryColor,
                  fontSize: `${Math.min(coverW / 8, 36)}px`,
                  fontWeight: 800,
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                  textShadow: "0 2px 10px rgba(0,0,0,0.2)",
                }}
              >
                {familyName}
              </h1>

              {/* Book title */}
              <p
                style={{
                  margin: "12px 0 0",
                  color: secondaryColor,
                  fontSize: `${Math.min(coverW / 16, 18)}px`,
                  fontWeight: 400,
                  textAlign: "center",
                  opacity: 0.85,
                }}
              >
                {bookTitle}
              </p>

              {/* Decorative element */}
              <div
                style={{
                  width: "40px",
                  height: "4px",
                  backgroundColor: secondaryColor,
                  opacity: 0.5,
                  marginTop: "20px",
                  borderRadius: "2px",
                }}
              />
            </>
          )}

          {frontImage && (
            <div
              style={{
                position: "absolute",
                bottom: "40px",
                left: 0,
                right: 0,
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  color: secondaryColor,
                  fontSize: `${Math.min(coverW / 10, 28)}px`,
                  fontWeight: 800,
                  textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                }}
              >
                {familyName}
              </h1>
              <p
                style={{
                  margin: "8px 0 0",
                  color: secondaryColor,
                  fontSize: `${Math.min(coverW / 20, 14)}px`,
                  textShadow: "0 1px 10px rgba(0,0,0,0.5)",
                }}
              >
                {bookTitle}
              </p>
            </div>
          )}
        </div>

        {/* Hardcover wrap bleed (if applicable) */}
        {coverType === "hard" && wrap > 0 && (
          <div
            style={{
              position: "absolute",
              inset: `${bleed}px`,
              border: `${wrap}px solid ${adjustColor(primaryColor, -30)}`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </Suspense>
  );
}

// Helper to darken/lighten a hex color
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
