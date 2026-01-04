// src/app/(app)/families/[familyId]/yearbook/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { periodTagFor } from "@/lib/utils";
import { PageCardPreview } from "@/components/FamilyStory/PageCardPreview";

interface PageData { id: string; title?: string; createdBy?: string; timePeriod?: { from?: unknown }; createdAt?: unknown; [key: string]: unknown; }

export default function YearbookPrintPage() {
  const params = useParams();
  const familyId = params.familyId as string;
  const searchParams = useSearchParams();
  const who = searchParams.get("who") || "All";
  const period = searchParams.get("period") || "All";
  const [pages, setPages] = useState<PageData[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!familyId || !db) return;
    const q = query(collection(db, `families/${familyId}/pages`), orderBy("order", "desc"));
    return onSnapshot(q, (snap) => setPages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PageData))));
  }, [familyId]);

  const filtered = useMemo(() => pages.filter((p) => (who === "All" || p.createdBy === who) && (period === "All" || periodTagFor(p) === period)), [pages, who, period]);

  useEffect(() => {
    if (!isClient) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [isClient]);

  if (!isClient || !db) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  return (
    <div>
      <style>{`@page { size: Letter portrait; margin: 0.5in; } @media print { .no-print { display: none !important; } } .toolbar { position: sticky; top: 0; display: flex; gap: 12px; justify-content: space-between; padding: 12px; background: #fff; border-bottom: 1px solid #eee; } .stack { max-width: 8.5in; margin: 16px auto; } .sheet { background: #fbfaf7; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin-bottom: 24px; page-break-after: always; }`}</style>
      <div className="toolbar no-print"><div><strong>Yearbook Print</strong> — {filtered.length} pages</div><div style={{ display: "flex", gap: 12 }}><button onClick={() => window.print()}>Print</button><Link href={`/families/${familyId}/story`}>Back to Story</Link></div></div>
      <div className="stack">{filtered.map((p) => <div className="sheet" key={p.id}><PageCardPreview familyId={familyId} page={p} /></div>)}</div>
    </div>
  );
}
