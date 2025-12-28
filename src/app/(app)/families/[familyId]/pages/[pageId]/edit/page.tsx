// src/app/(app)/families/[familyId]/pages/[pageId]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ScrapbookEditor, EditorState } from "@/components/ScrapbookEditor";

interface PageData {
  id: string;
  title?: string;
  state?: EditorState;
}

export default function PageEditRoute() {
  const params = useParams();
  const familyId = params.familyId as string;
  const pageId = params.pageId as string;
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!familyId || !pageId || !db) return;
    (async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, `families/${familyId}/pages/${pageId}`));
      setPage(snap.exists() ? { id: snap.id, ...snap.data() } as PageData : null);
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
    />
  );
}
