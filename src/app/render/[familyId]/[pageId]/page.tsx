// src/app/render/[familyId]/[pageId]/page.tsx
// Server-rendered page for Puppeteer capture

import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { verifyRenderToken } from '@/lib/renderToken';
import { RenderCanvasWrapper } from './RenderCanvasWrapper';

// Canvas dimensions for print quality
const CANVAS_WIDTH = 612;  // 8.5" at 72dpi
const CANVAS_HEIGHT = 792; // 11" at 72dpi

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ familyId: string; pageId: string }>;
  searchParams: Promise<{ token?: string; scale?: string }>;
}

export default async function RenderPage({ params, searchParams }: Props) {
  const { familyId, pageId } = await params;
  const { token, scale } = await searchParams;

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

  // Calculate scale factor (1 = 72dpi, 4.17 = 300dpi)
  const scaleFactor = scale ? parseFloat(scale) : 1;
  const canvasWidth = Math.round(CANVAS_WIDTH * scaleFactor);
  const canvasHeight = Math.round(CANVAS_HEIGHT * scaleFactor);

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
        `}} />
      </head>
      <body>
        <RenderCanvasWrapper
          state={state}
          width={canvasWidth}
          height={canvasHeight}
          scaleFactor={scaleFactor}
        />
      </body>
    </html>
  );
}
