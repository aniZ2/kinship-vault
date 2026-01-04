// src/app/(app)/families/[familyId]/pages/[pageId]/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";
import { toggleAdminLock } from "@/lib/editorLock";
import { toDate } from "@/lib/utils";

const CF_HASH = process.env.NEXT_PUBLIC_CF_IMAGES_HASH || "";
const CF_VARIANT = process.env.NEXT_PUBLIC_CF_IMAGES_VARIANT || "public";
function cfUrlFromId(id: string): string {
  return !CF_HASH || !id
    ? ""
    : `https://imagedelivery.net/${CF_HASH}/${id}/${CF_VARIANT}`;
}

interface PageData {
  id: string;
  title?: string;
  previewURL?: string;
  previewRef?: string;
  coverRef?: string;
  cover?: { ref?: string; imageId?: string };
  status?: string;
  updatedAt?: unknown;
  isLocked?: boolean;
}

export default function PageViewRoute() {
  const params = useParams();
  const familyId = params.familyId as string;
  const pageId = params.pageId as string;

  const { currentUser } = useAuth();

  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [broken, setBroken] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Role state
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch page data
  useEffect(() => {
    if (!familyId || !pageId || !db) return;
    (async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, `families/${familyId}/pages/${pageId}`));
      const pageData = snap.exists()
        ? ({ id: snap.id, ...snap.data() } as PageData)
        : null;
      setPage(pageData);
      setIsLocked(pageData?.isLocked === true);
      setLoading(false);
    })();
  }, [familyId, pageId]);

  // Check if user is owner/admin
  useEffect(() => {
    if (!familyId || !currentUser || !db) return;
    (async () => {
      const membershipId = `${currentUser.uid}_${familyId}`;
      const snap = await getDoc(doc(db, `memberships/${membershipId}`));
      if (snap.exists()) {
        const role = snap.data()?.role;
        setIsOwnerOrAdmin(role === "owner" || role === "admin");
      }
    })();
  }, [familyId, currentUser]);

  const viewerSrc = useMemo(() => {
    if (broken || !page) return "";
    if (page.previewURL && /^https?:\/\//i.test(page.previewURL))
      return page.previewURL;
    const ref =
      page.previewRef || page.coverRef || page?.cover?.ref || page?.cover?.imageId;
    return ref ? cfUrlFromId(ref) : "";
  }, [broken, page]);

  const handleToggleLock = async () => {
    if (!currentUser || toggling) return;
    setToggling(true);
    const success = await toggleAdminLock(
      familyId,
      pageId,
      !isLocked,
      currentUser.uid
    );
    if (success) {
      setIsLocked(!isLocked);
    }
    setToggling(false);
  };

  if (!isClient || !db)
    return <div style={{ padding: 24 }}>Loading...</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!page)
    return (
      <div style={{ padding: 24 }}>
        Page not found.{" "}
        <Link href={`/families/${familyId}/story`}>Back to Family Story</Link>
      </div>
    );

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>
            {page.title || "Untitled Page"}
          </h1>
          {isLocked && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: "#fef2f2",
                color: "#991b1b",
                borderRadius: 16,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              🔒 Locked
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href={`/families/${familyId}/story`}>← Back</Link>
          {!isLocked && (
            <Link href={`/families/${familyId}/pages/${page.id}/edit`}>
              Edit
            </Link>
          )}
          {isOwnerOrAdmin && (
            <button
              onClick={handleToggleLock}
              disabled={toggling}
              style={{
                padding: "6px 14px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: isLocked ? "#dcfce7" : "#fff",
                color: isLocked ? "#166534" : "#374151",
                fontSize: 14,
                cursor: toggling ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isLocked ? "🔓 Unlock" : "🔒 Lock"}
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          marginTop: 16,
          border: "1px solid #e7e7ea",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 8px 24px rgba(0,0,0,.06)",
        }}
      >
        {viewerSrc ? (
          <Image
            src={viewerSrc}
            alt=""
            width={960}
            height={520}
            style={{ display: "block", width: "100%", height: "auto" }}
            onError={() => setBroken(true)}
            unoptimized
          />
        ) : (
          <div
            style={{
              height: 520,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa",
              color: "#9aa1ae",
            }}
          >
            No preview saved yet. Click &quot;Edit&quot; to create one.
          </div>
        )}
      </div>
      <div style={{ marginTop: 16, fontSize: 14, color: "#6b7280" }}>
        <div>
          <b>Status:</b> {page.status || "draft"}
        </div>
        {page.updatedAt && (
          <div>
            <b>Updated:</b>{" "}
            {toDate(page.updatedAt as Parameters<typeof toDate>[0])?.toLocaleString?.() || ""}
          </div>
        )}
      </div>
    </div>
  );
}
