// src/app/(app)/families/[familyId]/pages/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ScrapbookEditor, StorageInfo } from "@/components/ScrapbookEditor";
import { LIMITS } from "@/lib/stripe/products";

interface FamilyData {
  subscription?: {
    type: 'free' | 'pro';
  };
  storageUsedBytes?: number;
}

export default function NewPageRoute() {
  const params = useParams();
  const familyId = params?.familyId as string;
  const [isClient, setIsClient] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!familyId || !db) return;
    (async () => {
      const familySnap = await getDoc(doc(db, `families/${familyId}`));
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
  }, [familyId]);

  if (!isClient || loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div>Loading editor...</div>
      </div>
    );
  }

  return <ScrapbookEditor mode="edit" initialState={null} storageInfo={storageInfo} />;
}
