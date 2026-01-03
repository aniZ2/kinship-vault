// src/app/(app)/families/[familyId]/pages/[pageId]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ScrapbookEditor, EditorState, StorageInfo } from "@/components/ScrapbookEditor";
import { LIMITS } from "@/lib/stripe/products";

interface PageData {
  id: string;
  title?: string;
  state?: EditorState;
}

interface FamilyData {
  subscription?: {
    type: 'free' | 'pro';
  };
  storageUsedBytes?: number;
}

export default function PageEditRoute() {
  const params = useParams();
  const familyId = params.familyId as string;
  const pageId = params.pageId as string;
  const [page, setPage] = useState<PageData | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!familyId || !pageId || !db) return;
    (async () => {
      setLoading(true);

      // Fetch page and family data in parallel
      const [pageSnap, familySnap] = await Promise.all([
        getDoc(doc(db, `families/${familyId}/pages/${pageId}`)),
        getDoc(doc(db, `families/${familyId}`)),
      ]);

      setPage(pageSnap.exists() ? { id: pageSnap.id, ...pageSnap.data() } as PageData : null);

      // Build storage info from family data
      if (familySnap.exists()) {
        const familyData = familySnap.data() as FamilyData;
        const isPro = familyData.subscription?.type === 'pro';
        setStorageInfo({
          usedBytes: familyData.storageUsedBytes || 0,
          limitBytes: isPro ? Infinity : LIMITS.storagePerFamily.free,
          isPro,
        });
      }

      setLoading(false);
    })();
  }, [familyId, pageId]);

  if (!isClient || !db) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div>Loading editor...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div style={{ padding: 24 }}>
        Page not found. <Link href={`/families/${familyId}/story`}>Back to Family Story</Link>
      </div>
    );
  }

  return (
    <ScrapbookEditor
      mode="edit"
      initialState={page.state}
      storageInfo={storageInfo}
    />
  );
}
