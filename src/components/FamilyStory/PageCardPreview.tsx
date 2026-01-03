// src/components/FamilyStory/PageCardPreview.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./PageCardPreview.module.css";

interface EditorItem {
  id: string;
  type: string;
  src?: string;
  cfId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  text?: string;
  emoji?: string;
  [key: string]: unknown;
}

interface EditorState {
  background?: string;
  items?: EditorItem[];
  customBgUrl?: string;
}

interface PageData {
  id: string;
  title?: string;
  state?: EditorState;
  previewUrl?: string | { url?: string };
  preview?: string | { url?: string };
  cover?: string | { url?: string };
  coverImage?: string | { url?: string };
}

function urlLike(x: unknown): string | null {
  if (!x) return null;
  if (typeof x === "string" && /^https?:\/\//i.test(x)) return x;
  if (typeof x === "object" && x !== null && "url" in x && typeof (x as { url: unknown }).url === "string") {
    return (x as { url: string }).url;
  }
  return null;
}

function resolvePagePreviewUrl(page: PageData): string | null {
  return urlLike(page?.previewUrl) || urlLike(page?.preview) || urlLike(page?.cover) || urlLike(page?.coverImage) || null;
}

interface PageCardPreviewProps {
  familyId: string;
  page: PageData;
  className?: string;
  size?: "s" | "m" | "l";
}

export function PageCardPreview({ familyId, page, className, size = "m" }: PageCardPreviewProps) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const savedPreview = useMemo(() => resolvePagePreviewUrl(page), [page]);

  // Extract image URLs from state.items
  const imageItems = useMemo(() => {
    if (!page?.state?.items) return [];
    return page.state.items
      .filter(item => item.type === 'image' && item.src && !item.src.startsWith('blob:'))
      .sort((a, b) => b.zIndex - a.zIndex) // Show highest z-index first
      .slice(0, 4);
  }, [page?.state?.items]);

  // Get background info
  const bgInfo = useMemo(() => {
    if (!page?.state) return null;
    return {
      background: page.state.background || '#FDF8F0',
      customBgUrl: page.state.customBgUrl
    };
  }, [page?.state]);

  // Get text/sticker items for empty state decoration
  const decorItems = useMemo(() => {
    if (!page?.state?.items) return { texts: [], stickers: [] };
    const texts = page.state.items
      .filter(item => item.type === 'text' && item.text)
      .slice(0, 2);
    const stickers = page.state.items
      .filter(item => item.type === 'sticker' && item.emoji)
      .slice(0, 3);
    return { texts, stickers };
  }, [page?.state?.items]);

  const klass = useMemo(() => {
    const k = [styles.previewRoot, className || ""];
    k.push(size === "s" ? styles.sizeS : size === "l" ? styles.sizeL : styles.sizeM);
    return k.join(" ").trim();
  }, [className, size]);

  // If there's a manual preview URL, use it
  if (savedPreview && !broken['preview']) {
    return (
      <div className={klass} aria-label="Page preview">
        <Image
          src={savedPreview}
          alt={page?.title ? `Preview of "${page.title}"` : "Page preview"}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className={styles.coverImg}
          onError={() => setBroken(prev => ({ ...prev, preview: true }))}
          unoptimized
        />
        {page?.title ? <div className={styles.caption}>{page.title}</div> : null}
      </div>
    );
  }

  // If we have images from state.items, display them
  if (imageItems.length > 0) {
    const validImages = imageItems.filter(item => item.src && !broken[item.id]);

    if (validImages.length === 0) {
      // All images broken, show fallback
      return (
        <div className={`${klass} ${styles.fallback}`} style={bgInfo ? { background: bgInfo.background } : undefined} aria-label="Empty page preview">
          <div className={styles.fallbackInner}>
            <div className={styles.fallbackIcon}>📖</div>
            <div className={styles.fallbackTitle}>{page?.title || "Untitled"}</div>
          </div>
        </div>
      );
    }

    return (
      <div className={klass} style={bgInfo ? { background: bgInfo.background } : undefined} aria-label="Page preview mosaic">
        {validImages.length === 1 && (
          <Image
            src={validImages[0].src!}
            alt={page?.title ? `Preview of "${page.title}"` : "Page item"}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className={styles.coverImg}
            onError={() => setBroken(prev => ({ ...prev, [validImages[0].id]: true }))}
            unoptimized
          />
        )}
        {validImages.length === 2 && (
          <div className={`${styles.grid} ${styles.cols2}`}>
            {validImages.map((item) => (
              <span key={item.id} className={styles.gridItem}>
                <Image
                  src={item.src!}
                  alt="Page item"
                  fill
                  sizes="150px"
                  onError={() => setBroken(prev => ({ ...prev, [item.id]: true }))}
                  unoptimized
                />
              </span>
            ))}
          </div>
        )}
        {validImages.length === 3 && (
          <div className={`${styles.grid} ${styles.layout3}`}>
            <span className={`${styles.gridItem} ${styles.span2}`}>
              <Image
                src={validImages[0].src!}
                alt="Page item"
                fill
                sizes="200px"
                onError={() => setBroken(prev => ({ ...prev, [validImages[0].id]: true }))}
                unoptimized
              />
            </span>
            <span className={styles.gridItem}>
              <Image
                src={validImages[1].src!}
                alt="Page item"
                fill
                sizes="100px"
                onError={() => setBroken(prev => ({ ...prev, [validImages[1].id]: true }))}
                unoptimized
              />
            </span>
            <span className={styles.gridItem}>
              <Image
                src={validImages[2].src!}
                alt="Page item"
                fill
                sizes="100px"
                onError={() => setBroken(prev => ({ ...prev, [validImages[2].id]: true }))}
                unoptimized
              />
            </span>
          </div>
        )}
        {validImages.length >= 4 && (
          <div className={`${styles.grid} ${styles.cols2}`}>
            {validImages.slice(0, 4).map((item) => (
              <span key={item.id} className={styles.gridItem}>
                <Image
                  src={item.src!}
                  alt="Page item"
                  fill
                  sizes="150px"
                  onError={() => setBroken(prev => ({ ...prev, [item.id]: true }))}
                  unoptimized
                />
              </span>
            ))}
          </div>
        )}
        {page?.title ? <div className={styles.caption}>{page.title}</div> : null}
      </div>
    );
  }

  // Fallback: show decorative preview with text/stickers if available
  const hasDecor = decorItems.texts.length > 0 || decorItems.stickers.length > 0;

  return (
    <div
      className={`${klass} ${styles.fallback}`}
      style={bgInfo ? { background: bgInfo.customBgUrl ? `url(${bgInfo.customBgUrl}) center/cover` : bgInfo.background } : undefined}
      aria-label="Page preview"
    >
      <div className={styles.fallbackInner}>
        {hasDecor ? (
          <>
            {decorItems.stickers.length > 0 && (
              <div className={styles.stickerRow}>
                {decorItems.stickers.map((s, i) => (
                  <span key={i} className={styles.previewSticker}>{s.emoji}</span>
                ))}
              </div>
            )}
            {decorItems.texts.length > 0 && (
              <div className={styles.previewText}>
                {decorItems.texts[0].text?.slice(0, 50)}{decorItems.texts[0].text && decorItems.texts[0].text.length > 50 ? '...' : ''}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.fallbackIcon}>📖</div>
            <div className={styles.fallbackTitle}>{page?.title || "Untitled"}</div>
          </>
        )}
      </div>
    </div>
  );
}
