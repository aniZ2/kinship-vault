// src/app/(app)/families/[familyId]/story/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, orderBy, query, getDocs, writeBatch, doc, deleteDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { periodTagFor } from "@/lib/utils";
import { PageCardPreview } from "@/components/FamilyStory/PageCardPreview";
import styles from "@/components/FamilyStory/FamilyStory.module.css";

interface PageData {
  id: string;
  title?: string;
  createdBy?: string;
  contributors?: string[];
  createdAt?: { toMillis?: () => number };
  timePeriod?: { from?: unknown };
  [key: string]: unknown;
}

export default function FamilyStoryPage() {
  const params = useParams();
  const familyId = params.familyId as string;
  const router = useRouter();
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [familyExists, setFamilyExists] = useState(true);
  const [who, setWho] = useState("All");
  const [period, setPeriod] = useState("All");
  const [q, setQ] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState(0);

  // Get current user on client only
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setMe(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!familyId || !db) return;
    const famRef = doc(db, `families/${familyId}`);
    const unsub = onSnapshot(famRef, (snap) => {
      setFamilyExists(snap.exists());
      if (!snap.exists()) { try { localStorage.removeItem("kv:lastFamilyId"); } catch {} router.replace("/families"); }
      else {
        try { localStorage.setItem("kv:lastFamilyId", familyId); } catch {}
        // Get pending upload count
        const data = snap.data();
        setPendingUploads(data?.pendingUploadCount || 0);
      }
    }, () => { setFamilyExists(false); router.replace("/families"); });
    return () => unsub();
  }, [familyId, router]);

  useEffect(() => {
    if (!familyId || !familyExists || !db) return;
    setLoading(true);
    const pagesCol = collection(db, `families/${familyId}/pages`);
    const q1 = query(pagesCol, orderBy("order", "desc"));
    const unsub = onSnapshot(q1, (snap) => {
      setPages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PageData)));
      setLoading(false);
    }, async () => {
      const q2 = query(pagesCol, orderBy("createdAt", "desc"));
      onSnapshot(q2, (snap2) => {
        setPages(snap2.docs.map((d) => ({ id: d.id, ...d.data() } as PageData)));
        setLoading(false);
      }, async () => {
        const s3 = await getDocs(pagesCol);
        setPages(s3.docs.map((d) => ({ id: d.id, ...d.data() } as PageData)));
        setLoading(false);
      });
    });
    return () => unsub();
  }, [familyId, familyExists]);

  const whoOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of pages) { if (p.createdBy) s.add(p.createdBy); if (Array.isArray(p.contributors)) for (const c of p.contributors) s.add(c); }
    return ["All", ...Array.from(s).sort()];
  }, [pages]);

  const periodOptions = useMemo(() => {
    const s = new Set(["All"]); pages.forEach((p) => s.add(periodTagFor(p)));
    const arr = Array.from(s);
    const decades = arr.filter((x) => !["All", "This Year", "Unknown"].includes(x)).sort((a, b) => Number(b.match(/\d+/)?.[0] || 0) - Number(a.match(/\d+/)?.[0] || 0));
    const out = ["All"]; if (arr.includes("This Year")) out.push("This Year"); out.push(...decades); if (arr.includes("Unknown")) out.push("Unknown");
    return out;
  }, [pages]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pages.filter((p) => {
      const whoOk = who === "All" || p.createdBy === who || (Array.isArray(p.contributors) && p.contributors.includes(who));
      const periodOk = period === "All" || periodTagFor(p) === period;
      const qOk = needle ? `${p.title || ""}`.toLowerCase().includes(needle) : true;
      return whoOk && periodOk && qOk;
    });
  }, [pages, who, period, q]);

  async function deletePage(page: PageData) {
    if (!familyId || !page?.id || !db || !window.confirm("Delete this page?")) return;
    setDeleting((prev) => ({ ...prev, [page.id]: true }));
    try {
      const elementsSnap = await getDocs(collection(db, `families/${familyId}/pages/${page.id}/items`));
      const batch = writeBatch(db);
      elementsSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await deleteDoc(doc(db, `families/${familyId}/pages/${page.id}`));
    } catch (e) { console.error(e); alert("Could not delete page."); }
    finally { setDeleting((prev) => { const n = { ...prev }; delete n[page.id]; return n; }); }
  }

  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});
  function saveTitleDebounced(pageId: string, title: string) {
    if (!db) return;
    const firestore = db; // Capture for closure
    clearTimeout(timersRef.current[pageId]);
    timersRef.current[pageId] = setTimeout(async () => {
      try { await updateDoc(doc(firestore, `families/${familyId}/pages/${pageId}`), { title: title || "", updatedAt: new Date() }); } catch {}
    }, 450);
  }

  // SSR loading state
  if (!db) {
    return (
      <div className={styles.page}>
        <div style={{ padding: "4rem", textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <h1 className={styles.h1}>Family Story</h1>
          <div className={styles.subtitle}>{loading ? "Loading…" : `${filtered.length} of ${pages.length} pages shown`}</div>
        </div>
        <div className={styles.filters}>
          <label className={styles.filterField}><span>Who</span><select value={who} onChange={(e) => setWho(e.target.value)}>{whoOptions.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
          <label className={styles.filterField}><span>Period</span><select value={period} onChange={(e) => setPeriod(e.target.value)}>{periodOptions.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
          <label className={styles.filterField} style={{ minWidth: 220 }}><span>Search</span><input type="search" placeholder="Title…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <div className={styles.previewCtas}>
            <Link className={styles.ctaPrimary} href={`/families/${familyId}/pages/new`}>+ New Page</Link>
            <Link className={styles.ctaGhost} href={`/families/${familyId}/yearbook`}>Print Yearbook</Link>
            <Link className={styles.ctaGhost} href={`/families/${familyId}/qr`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              QR Upload
            </Link>
            <Link className={`${styles.ctaGhost} ${pendingUploads > 0 ? styles.ctaWithBadge : ''}`} href={`/families/${familyId}/moderate`}>
              Moderation
              {pendingUploads > 0 && <span className={styles.pendingBadge}>{pendingUploads}</span>}
            </Link>
          </div>
        </div>
      </header>
      <section className={styles.wall}>
        {loading && <div className={styles.skeletonGrid}>{Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)}</div>}
        {!loading && filtered.length === 0 && <div className={styles.empty}>Nothing here yet. Create your first page.</div>}
        {!loading && filtered.length > 0 && (
          <div className={styles.grid}>
            {filtered.map((p) => (
              <article key={p.id} className={styles.card}>
                <Link className={styles.cardLink} href={`/families/${familyId}/pages/${p.id}`}><PageCardPreview familyId={familyId} page={p} className={styles.preview} /></Link>
                <div className={styles.cardMeta}>
                  {me && p.createdBy === me ? <input className={styles.titleInput} defaultValue={p.title || ""} placeholder="Add a title…" onChange={(e) => saveTitleDebounced(p.id, e.target.value)} onClick={(e) => e.stopPropagation()} /> : <div className={styles.cardTitle}>{p.title || "Untitled"}</div>}
                  <div className={styles.cardSubrow}><span className={styles.badge}>{periodTagFor(p)}</span></div>
                </div>
                <button onClick={() => deletePage(p)} className={styles.deleteBtn} disabled={!!deleting[p.id]}>{deleting[p.id] ? "…" : "×"}</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
