// src/app/view/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PageCardPreview } from "@/components/FamilyStory/PageCardPreview";
import styles from "./view.module.css";

interface ViewToken {
  token: string;
  familyId: string;
  guestName: string;
  guestEmail?: string;
  createdAt: { toMillis?: () => number };
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canInvite: boolean;
    canDownload: boolean;
  };
}

interface FamilyData {
  name: string;
}

interface PageData {
  id: string;
  title?: string;
  createdAt?: { toMillis?: () => number };
  state?: unknown;
}

export default function GuestViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<ViewToken | null>(null);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageData | null>(null);

  useEffect(() => {
    if (!token || !db) return;

    async function loadData() {
      try {
        // Look up the token
        const tokenRef = doc(db, `viewTokens/${token}`);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
          setError("This link is invalid or has expired.");
          setLoading(false);
          return;
        }

        const tokenInfo = tokenSnap.data() as ViewToken;

        if (!tokenInfo.permissions?.canView) {
          setError("You don't have permission to view this scrapbook.");
          setLoading(false);
          return;
        }

        setTokenData(tokenInfo);

        // Get family data
        const familyRef = doc(db, `families/${tokenInfo.familyId}`);
        const familySnap = await getDoc(familyRef);

        if (!familySnap.exists()) {
          setError("This family scrapbook no longer exists.");
          setLoading(false);
          return;
        }

        setFamily(familySnap.data() as FamilyData);

        // Get pages
        const pagesRef = collection(db, `families/${tokenInfo.familyId}/pages`);
        const pagesQuery = query(pagesRef, orderBy("order", "desc"));
        const pagesSnap = await getDocs(pagesQuery);

        setPages(pagesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PageData)));
        setLoading(false);
      } catch (err) {
        console.error("Error loading view data:", err);
        setError("Something went wrong. Please try again later.");
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  if (!db) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading scrapbook...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1>Unable to View</h1>
          <p>{error}</p>
          <Link href="/" className={styles.homeLink}>
            Go to Kinship Vault
          </Link>
        </div>
      </div>
    );
  }

  // Page detail view
  if (selectedPage) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => setSelectedPage(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Album
          </button>
          <h1 className={styles.pageTitle}>{selectedPage.title || "Untitled Page"}</h1>
        </header>
        <main className={styles.pageDetail}>
          <div className={styles.pagePreviewLarge}>
            <PageCardPreview
              familyId={tokenData?.familyId || ""}
              page={selectedPage}
              className={styles.largePreview}
              size="large"
            />
          </div>
        </main>
      </div>
    );
  }

  // Album grid view
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.guestBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View Only
          </div>
          <h1 className={styles.familyName}>{family?.name || "Family"} Scrapbook</h1>
          {tokenData?.guestName && (
            <p className={styles.welcomeText}>Welcome, {tokenData.guestName}</p>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {pages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <h3>No Pages Yet</h3>
            <p>This scrapbook does not have any pages yet. Check back later!</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {pages.map((page) => (
              <button
                key={page.id}
                className={styles.card}
                onClick={() => setSelectedPage(page)}
              >
                <PageCardPreview
                  familyId={tokenData?.familyId || ""}
                  page={page}
                  className={styles.cardPreview}
                />
                <div className={styles.cardMeta}>
                  <span className={styles.cardTitle}>{page.title || "Untitled"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Powered by{" "}
          <Link href="/" className={styles.footerLink}>
            Kinship Vault
          </Link>
        </p>
      </footer>
    </div>
  );
}
