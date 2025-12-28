// src/components/FamilyStory/PageCardPreview.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit as fbLimit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import styles from "./PageCardPreview.module.css";

interface PageData {
  id: string;
  title?: string;
  previewUrl?: string | { url?: string };
  preview?: string | { url?: string };
  cover?: string | { url?: string };
  coverImage?: string | { url?: string };
}

interface ItemData {
  type?: string;
  previewUrl?: string | { url?: string };
  thumb?: string | { url?: string };
  thumbnail?: string | { url?: string };
  url?: string;
  src?: string;
  imageUrl?: string;
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

function resolveItemUrl(it: ItemData): string | null {
  return urlLike(it?.previewUrl) || urlLike(it?.thumb) || urlLike(it?.thumbnail) || urlLike(it?.url) || urlLike(it?.src) || urlLike(it?.imageUrl) || null;
}

interface PageCardPreviewProps {
  familyId: string;
  page: PageData;
  className?: string;
  size?: "s" | "m" | "l";
}

export function PageCardPreview({ familyId, page, className, size = "m" }: PageCardPreviewProps) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [broken, setBroken] = useState(false);

  const savedPreview = useMemo(() => resolvePagePreviewUrl(page), [page]);

  useEffect(() => {
    if (!familyId || !page?.id || savedPreview) { setLoading(false); return; }
    const itemsCol = collection(db, `families/${familyId}/pages/${page.id}/items`);
    const q1 = query(itemsCol, orderBy("createdAt", "desc"), fbLimit(24));
    const unsub = onSnapshot(q1, (snap) => {
      const urls: string[] = [];
      snap.forEach((d) => {
        const it = d.data() as ItemData;
        if (it?.type && !String(it.type).toLowerCase().includes("image")) return;
        const u = resolveItemUrl(it);
        if (u) urls.push(u);
      });
      setThumbs(Array.from(new Set(urls)).slice(0, 4));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [familyId, page?.id, savedPreview]);

  const klass = useMemo(() => {
    const k = [styles.previewRoot, className || ""];
    k.push(size === "s" ? styles.sizeS : size === "l" ? styles.sizeL : styles.sizeM);
    return k.join(" ").trim();
  }, [className, size]);

  if (savedPreview && !broken) {
    return (
      <div className={klass} aria-label="Page preview">
        <Image src={savedPreview} alt={page?.title ? `Preview of "${page.title}"` : "Page preview"} fill sizes="(max-width: 768px) 100vw, 300px" className={styles.coverImg} onError={() => setBroken(true)} unoptimized />
        {page?.title ? <div className={styles.caption}>{page.title}</div> : null}
      </div>
    );
  }

  if (!loading && thumbs.length === 0) {
    return (
      <div className={`${klass} ${styles.fallback}`} aria-label="Empty page preview">
        <div className={styles.fallbackInner}>
          <div className={styles.fallbackIcon}>📖</div>
          <div className={styles.fallbackTitle}>{page?.title || "Untitled"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={klass} aria-label="Page preview mosaic">
      {loading && <div className={styles.skeleton} />}
      {!loading && thumbs.length === 1 && <Image src={thumbs[0]} alt={page?.title ? `Preview of "${page.title}"` : "Page item"} fill sizes="(max-width: 768px) 100vw, 300px" className={styles.coverImg} unoptimized />}
      {!loading && thumbs.length === 2 && (
        <div className={`${styles.grid} ${styles.cols2}`}>{thumbs.map((u, i) => <span key={i} className={styles.gridItem}><Image src={u} alt={`Item ${i + 1}`} fill sizes="150px" unoptimized /></span>)}</div>
      )}
      {!loading && thumbs.length === 3 && (
        <div className={`${styles.grid} ${styles.layout3}`}>
          <span className={`${styles.gridItem} ${styles.span2}`}><Image src={thumbs[0]} alt="Item 1" fill sizes="200px" unoptimized /></span>
          <span className={styles.gridItem}><Image src={thumbs[1]} alt="Item 2" fill sizes="100px" unoptimized /></span>
          <span className={styles.gridItem}><Image src={thumbs[2]} alt="Item 3" fill sizes="100px" unoptimized /></span>
        </div>
      )}
      {!loading && thumbs.length >= 4 && (
        <div className={`${styles.grid} ${styles.cols2}`}>{thumbs.slice(0, 4).map((u, i) => <span key={i} className={styles.gridItem}><Image src={u} alt={`Item ${i + 1}`} fill sizes="150px" unoptimized /></span>)}</div>
      )}
      {page?.title ? <div className={styles.caption}>{page.title}</div> : null}
    </div>
  );
}
