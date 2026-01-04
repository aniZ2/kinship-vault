// src/app/render/[familyId]/[pageId]/page.tsx
// Server-rendered page for Puppeteer capture
// Supports both legacy rendering and book compilation (Lulu 2026 specs)

import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { verifyRenderToken } from '@/lib/renderToken';
import { RenderCanvasWrapper } from './RenderCanvasWrapper';

// Legacy canvas dimensions (8.5x11 at 72dpi)
const CANVAS_WIDTH = 612;  // 8.5" at 72dpi
const CANVAS_HEIGHT = 792; // 11" at 72dpi

// Book sizes for compilation (Lulu 2026 specs)
// Bleed: 0.125" (9px at 72dpi), Safety: 0.5" (36px at 72dpi)
const BOOK_SIZES: Record<string, { width: number; height: number; name: string }> = {
  '8x8': { width: 576, height: 576, name: '8×8 Square' },
  '10x10': { width: 720, height: 720, name: '10×10 Square' },
  '8.5x11': { width: 612, height: 792, name: '8.5×11 Portrait' },
};

const BLEED_PX = 9;  // 0.125" at 72dpi
const SAFETY_PX = 36; // 0.5" at 72dpi

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ familyId: string; pageId: string }>;
  searchParams: Promise<{
    token?: string;
    scale?: string;
    // Book compilation params
    bookSize?: string;
    includeBleed?: string;
    forPrint?: string;
  }>;
}

export default async function RenderPage({ params, searchParams }: Props) {
  const { familyId, pageId } = await params;
  const { token, scale, bookSize, includeBleed, forPrint } = await searchParams;

  // Verify token
  if (!token) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>403 - Forbidden</h1>
        <p>Missing render token</p>
      </div>
    );
  }

  const tokenPayload = verifyRenderToken(token);
  if (!tokenPayload) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>403 - Forbidden</h1>
        <p>Invalid or expired render token</p>
      </div>
    );
  }

  // Verify token matches the requested page
  if (tokenPayload.familyId !== familyId || tokenPayload.pageId !== pageId) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>403 - Forbidden</h1>
        <p>Token does not match requested page</p>
      </div>
    );
  }

  // Fetch page data from Firestore
  const pageDoc = await adminDb
    .collection('families')
    .doc(familyId)
    .collection('pages')
    .doc(pageId)
    .get();

  if (!pageDoc.exists) {
    notFound();
  }

  const pageData = pageDoc.data();
  const state = pageData?.state || { background: 'cream', items: [] };

  // Determine canvas dimensions
  // For book compilation: use book size + optional bleed
  // For legacy: use scale factor on default 8.5x11
  const isBookCompilation = bookSize && BOOK_SIZES[bookSize];
  const shouldIncludeBleed = includeBleed === 'true';
  const isForPrint = forPrint === 'true';

  let baseWidth: number;
  let baseHeight: number;
  let bleedOffset = 0;

  if (isBookCompilation) {
    // Book compilation mode
    const size = BOOK_SIZES[bookSize];
    baseWidth = size.width;
    baseHeight = size.height;
    if (shouldIncludeBleed) {
      bleedOffset = BLEED_PX;
      baseWidth += BLEED_PX * 2;
      baseHeight += BLEED_PX * 2;
    }
  } else {
    // Legacy mode
    baseWidth = CANVAS_WIDTH;
    baseHeight = CANVAS_HEIGHT;
  }

  // Apply scale factor (for legacy mode with viewport scaling)
  // Note: For book compilation, deviceScaleFactor handles 300 DPI
  const scaleFactor = scale ? parseFloat(scale) : 1;
  const canvasWidth = Math.round(baseWidth * scaleFactor);
  const canvasHeight = Math.round(baseHeight * scaleFactor);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content={`width=${canvasWidth}, initial-scale=1`} />
        <title>Render - {pageData?.title || 'Page'}</title>
        {/* Load Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Caveat:wght@400;700&family=Courier+Prime&family=Dancing+Script:wght@400;700&family=Inter:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=Oswald:wght@400;500;600;700&family=Pacifico&family=Playfair+Display:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Raleway:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: ${canvasWidth}px;
            height: ${canvasHeight}px;
            overflow: hidden;
            background: transparent;
          }
          @media print {
            * {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
          ${isForPrint ? `
          /* Print optimization: disable subpixel antialiasing for sharper text */
          * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          ` : ''}
        `}} />
      </head>
      <body>
        <RenderCanvasWrapper
          state={state}
          width={canvasWidth}
          height={canvasHeight}
          scaleFactor={scaleFactor}
          bleedOffset={shouldIncludeBleed ? bleedOffset * scaleFactor : 0}
          isForPrint={isForPrint}
        />
      </body>
    </html>
  );
}
