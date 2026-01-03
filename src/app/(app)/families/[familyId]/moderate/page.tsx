// src/app/(app)/families/[familyId]/moderate/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import styles from "./moderate.module.css";

interface PendingUpload {
  id: string;
  imageId: string;
  imageUrl: string;
  guestName: string;
  guestEmail?: string;
  status: "pending" | "approved" | "rejected";
  sizeBytes?: number;
  createdAt?: { toMillis?: () => number };
  viewToken?: string;
}

function generateViewToken(): string {
  // Generate a URL-safe random token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

type TabType = "pending" | "approved" | "rejected";

export default function ModeratePage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId as string;

  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [familyName, setFamilyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Fetch family name
  useEffect(() => {
    if (!familyId || !db) return;
    getDoc(doc(db, `families/${familyId}`)).then((snap) => {
      if (snap.exists()) {
        setFamilyName(snap.data()?.name || "");
      } else {
        router.replace("/families");
      }
    });
  }, [familyId, router]);

  // Subscribe to pending uploads
  useEffect(() => {
    if (!familyId || !db) return;

    const uploadsRef = collection(db, `families/${familyId}/pendingUploads`);
    const q = query(uploadsRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setUploads(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingUpload))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching uploads:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [familyId]);

  const filteredUploads = uploads.filter((u) => u.status === activeTab);
  const pendingCount = uploads.filter((u) => u.status === "pending").length;
  const approvedCount = uploads.filter((u) => u.status === "approved").length;
  const rejectedCount = uploads.filter((u) => u.status === "rejected").length;

  const handleApprove = async (upload: PendingUpload) => {
    if (!familyId || !db) return;
    setProcessing((prev) => ({ ...prev, [upload.id]: true }));

    try {
      // Generate a view token for the guest
      const viewToken = generateViewToken();

      // Create the view token document
      await setDoc(doc(db, `viewTokens/${viewToken}`), {
        token: viewToken,
        familyId,
        guestName: upload.guestName,
        guestEmail: upload.guestEmail || null,
        createdAt: serverTimestamp(),
        permissions: {
          canView: true,
          canEdit: false,
          canInvite: false,
          canDownload: true,
        },
      });

      // Update status to approved and store view token
      await updateDoc(doc(db, `families/${familyId}/pendingUploads/${upload.id}`), {
        status: "approved",
        approvedAt: serverTimestamp(),
        viewToken,
      });

      // Decrement pending count
      await updateDoc(doc(db, `families/${familyId}`), {
        pendingUploadCount: increment(-1),
      }).catch(() => {});
    } catch (err) {
      console.error("Error approving upload:", err);
      alert("Failed to approve upload");
    } finally {
      setProcessing((prev) => ({ ...prev, [upload.id]: false }));
    }
  };

  const handleReject = async (upload: PendingUpload) => {
    if (!familyId || !db) return;
    if (!confirm("Reject this photo? It will be hidden from the family.")) return;

    setProcessing((prev) => ({ ...prev, [upload.id]: true }));

    try {
      // Update status to rejected
      await updateDoc(doc(db, `families/${familyId}/pendingUploads/${upload.id}`), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
      });

      // Decrement pending count
      await updateDoc(doc(db, `families/${familyId}`), {
        pendingUploadCount: increment(-1),
      }).catch(() => {});
    } catch (err) {
      console.error("Error rejecting upload:", err);
      alert("Failed to reject upload");
    } finally {
      setProcessing((prev) => ({ ...prev, [upload.id]: false }));
    }
  };

  const handleDelete = async (upload: PendingUpload) => {
    if (!familyId || !db) return;
    if (!confirm("Delete this photo permanently? This cannot be undone.")) return;

    setProcessing((prev) => ({ ...prev, [upload.id]: true }));

    try {
      // Delete from Cloudflare R2 storage
      if (upload.imageId) {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          await fetch("/api/delete-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              imageId: upload.imageId,
              familyId,
            }),
          }).catch((err) => {
            console.error("Failed to delete from R2:", err);
          });
        }
      }

      // Delete the Firestore document
      await deleteDoc(doc(db, `families/${familyId}/pendingUploads/${upload.id}`));
    } catch (err) {
      console.error("Error deleting upload:", err);
      alert("Failed to delete upload");
    } finally {
      setProcessing((prev) => ({ ...prev, [upload.id]: false }));
    }
  };

  const formatDate = (timestamp?: { toMillis?: () => number }) => {
    if (!timestamp?.toMillis) return "Unknown";
    return new Date(timestamp.toMillis()).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyViewLink = async (upload: PendingUpload) => {
    if (!upload.viewToken) return;
    const link = `${window.location.origin}/view/${upload.viewToken}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(upload.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBatchApprove = async () => {
    const pendingUploads = uploads.filter((u) => u.status === "pending");
    if (pendingUploads.length === 0) return;
    if (!confirm(`Approve all ${pendingUploads.length} pending photos?`)) return;

    setBatchProcessing(true);
    for (const upload of pendingUploads) {
      await handleApprove(upload);
    }
    setBatchProcessing(false);
  };

  const handleBatchReject = async () => {
    const pendingUploads = uploads.filter((u) => u.status === "pending");
    if (pendingUploads.length === 0) return;
    if (!confirm(`Reject all ${pendingUploads.length} pending photos? This action cannot be undone.`)) return;

    setBatchProcessing(true);
    for (const upload of pendingUploads) {
      setProcessing((prev) => ({ ...prev, [upload.id]: true }));
      try {
        await updateDoc(doc(db!, `families/${familyId}/pendingUploads/${upload.id}`), {
          status: "rejected",
          rejectedAt: serverTimestamp(),
        });
        await updateDoc(doc(db!, `families/${familyId}`), {
          pendingUploadCount: increment(-1),
        }).catch(() => {});
      } catch (err) {
        console.error("Error rejecting upload:", err);
      } finally {
        setProcessing((prev) => ({ ...prev, [upload.id]: false }));
      }
    }
    setBatchProcessing(false);
  };

  const totalStorageBytes = uploads.reduce((acc, u) => acc + (u.sizeBytes || 0), 0);
  const formatTotalSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!db) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link href={`/families/${familyId}/story`} className={styles.backLink}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Story
          </Link>
          <Link href={`/families/${familyId}/qr`} className={styles.qrLink}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            QR Code
          </Link>
        </div>
        <h1 className={styles.title}>Guest Photo Uploads</h1>
        <p className={styles.subtitle}>
          Review photos uploaded by guests for {familyName || "your family"}
        </p>

        {/* Stats Banner */}
        {uploads.length > 0 && (
          <div className={styles.statsBanner}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{uploads.length}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.statPending}`}>{pendingCount}</span>
              <span className={styles.statLabel}>Pending</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={`${styles.statValue} ${styles.statApproved}`}>{approvedCount}</span>
              <span className={styles.statLabel}>Approved</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatTotalSize(totalStorageBytes)}</span>
              <span className={styles.statLabel}>Storage</span>
            </div>
          </div>
        )}
      </header>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "pending" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending
            {pendingCount > 0 && <span className={styles.badge}>{pendingCount}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "approved" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("approved")}
          >
            Approved
            {approvedCount > 0 && <span className={styles.badgeGreen}>{approvedCount}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "rejected" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("rejected")}
          >
            Rejected
            {rejectedCount > 0 && <span className={styles.badgeRed}>{rejectedCount}</span>}
          </button>
        </div>

        {/* Batch Actions */}
        {activeTab === "pending" && pendingCount > 1 && (
          <div className={styles.batchActions}>
            <button
              className={styles.batchApprove}
              onClick={handleBatchApprove}
              disabled={batchProcessing}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Approve All
            </button>
            <button
              className={styles.batchReject}
              onClick={handleBatchReject}
              disabled={batchProcessing}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Reject All
            </button>
          </div>
        )}
      </div>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading uploads...</span>
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              {activeTab === "pending" ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              ) : activeTab === "approved" ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              )}
            </div>
            <h3>
              {activeTab === "pending"
                ? "No pending uploads"
                : activeTab === "approved"
                ? "No approved photos yet"
                : "No rejected photos"}
            </h3>
            <p>
              {activeTab === "pending"
                ? "Share the QR code to let guests upload photos"
                : activeTab === "approved"
                ? "Approved photos will appear here"
                : "Rejected photos will appear here"}
            </p>
            {activeTab === "pending" && (
              <Link href={`/families/${familyId}/qr`} className={styles.emptyAction}>
                Get QR Code
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredUploads.map((upload) => (
              <div key={upload.id} className={styles.card}>
                <div className={styles.imageWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={upload.imageUrl}
                    alt={`Photo from ${upload.guestName}`}
                    className={styles.image}
                    loading="lazy"
                  />
                  {processing[upload.id] && (
                    <div className={styles.processingOverlay}>
                      <div className={styles.spinner} />
                    </div>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  <div className={styles.guestInfo}>
                    <span className={styles.guestName}>{upload.guestName}</span>
                    <span className={styles.uploadDate}>{formatDate(upload.createdAt)}</span>
                  </div>
                  {upload.sizeBytes && (
                    <span className={styles.fileSize}>{formatSize(upload.sizeBytes)}</span>
                  )}
                </div>
                <div className={styles.cardActions}>
                  {activeTab === "pending" && (
                    <>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApprove(upload)}
                        disabled={processing[upload.id]}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Approve
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleReject(upload)}
                        disabled={processing[upload.id]}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </>
                  )}
                  {activeTab === "approved" && (
                    <>
                      {upload.viewToken && (
                        <button
                          className={`${styles.copyLinkBtn} ${copiedId === upload.id ? styles.copied : ""}`}
                          onClick={() => copyViewLink(upload)}
                        >
                          {copiedId === upload.id ? (
                            <>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy View Link
                            </>
                          )}
                        </button>
                      )}
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleReject(upload)}
                        disabled={processing[upload.id]}
                      >
                        Move to Rejected
                      </button>
                    </>
                  )}
                  {activeTab === "rejected" && (
                    <>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApprove(upload)}
                        disabled={processing[upload.id]}
                      >
                        Approve
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(upload)}
                        disabled={processing[upload.id]}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
