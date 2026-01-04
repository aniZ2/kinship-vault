// src/app/upload/[familyId]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { checkClientRateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import styles from "./upload.module.css";

interface FamilyData {
  name?: string;
  uploadSecret?: string;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export default function GuestUploadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.familyId as string;
  const uploadSecret = searchParams.get("s") || "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [family, setFamily] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(true);

  // Fetch family data and validate secret
  useEffect(() => {
    if (!familyId || !db) return;

    // Check if secret is provided in URL
    if (!uploadSecret) {
      setInvalidLink(true);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, `families/${familyId}`));
        if (snap.exists()) {
          const data = snap.data() as FamilyData;
          // Validate the upload secret
          if (data.uploadSecret !== uploadSecret) {
            setInvalidLink(true);
          } else {
            setFamily(data);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
  }, [familyId, uploadSecret]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    // Check rate limit (use burst limit for client-side check)
    const rateCheck = checkClientRateLimit(
      "guest-upload",
      RATE_LIMITS.guestUploadBurst.maxRequests,
      RATE_LIMITS.guestUploadBurst.windowMs
    );
    if (!rateCheck.allowed) {
      alert(`Upload limit reached. Please wait ${Math.ceil(rateCheck.resetIn / 60000)} minutes.`);
      return;
    }

    const newUploads: UploadItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      progress: 0,
    }));

    setUploads((prev) => [...prev, ...newUploads]);
    e.target.value = "";
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((u) => u.id !== id);
    });
  };

  const submitUploads = async () => {
    const pendingUploads = uploads.filter((u) => u.status === "pending");
    if (!pendingUploads.length) return;

    setUploading(true);

    for (const upload of pendingUploads) {
      setUploads((prev) =>
        prev.map((u) => (u.id === upload.id ? { ...u, status: "uploading" as const, progress: 10 } : u))
      );

      try {
        const formData = new FormData();
        formData.append("file", upload.file);
        formData.append("familyId", familyId);
        formData.append("uploadSecret", uploadSecret);
        formData.append("guestName", guestName.trim() || "Anonymous");

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id && u.status === "uploading"
                ? { ...u, progress: Math.min(90, u.progress + 10) }
                : u
            )
          );
        }, 200);

        const response = await fetch("/api/guest-upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }

        setUploads((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, status: "success" as const, progress: 100 } : u))
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? { ...u, status: "error" as const, error: err instanceof Error ? err.message : "Upload failed" }
              : u
          )
        );
      }
    }

    setUploading(false);
  };

  const pendingCount = uploads.filter((u) => u.status === "pending").length;
  const successCount = uploads.filter((u) => u.status === "success").length;
  const allDone = uploads.length > 0 && uploads.every((u) => u.status === "success" || u.status === "error");

  if (loading || !db) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (notFound || invalidLink) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>?</div>
          <h1>{notFound ? "Family Not Found" : "Invalid Upload Link"}</h1>
          <p>This upload link may be invalid or expired. Please ask for a new QR code.</p>
        </div>
      </div>
    );
  }

  // Name prompt screen
  if (showNamePrompt && uploads.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <h1 className={styles.welcomeTitle}>Share Photos with {family?.name || "Family"}</h1>
            <p className={styles.welcomeText}>
              Upload your photos to contribute to the family story
            </p>

            <div className={styles.nameInput}>
              <label>Your Name (optional)</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={50}
              />
            </div>

            <button
              className={styles.continueBtn}
              onClick={() => {
                setShowNamePrompt(false);
                fileInputRef.current?.click();
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Choose Photos
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className={styles.hiddenInput}
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>{family?.name || "Family"}</h1>
          {guestName && <span className={styles.guestBadge}>Uploading as {guestName}</span>}
        </header>

        {/* Success state */}
        {allDone && successCount > 0 && (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2>Photos Uploaded!</h2>
            <p>
              {successCount} photo{successCount !== 1 ? "s" : ""} sent for review.
              The family will see them soon.
            </p>
            <button
              className={styles.addMoreBtn}
              onClick={() => {
                setUploads([]);
                fileInputRef.current?.click();
              }}
            >
              Upload More Photos
            </button>
          </div>
        )}

        {/* Upload grid */}
        {!allDone && (
          <>
            <div className={styles.uploadGrid}>
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className={`${styles.uploadItem} ${styles[upload.status]}`}
                >
                  <img src={upload.preview} alt="" className={styles.uploadPreview} />
                  <div className={styles.uploadOverlay}>
                    {upload.status === "pending" && (
                      <button
                        className={styles.removeBtn}
                        onClick={() => removeUpload(upload.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {upload.status === "uploading" && (
                      <div className={styles.progressRing}>
                        <svg viewBox="0 0 36 36">
                          <path
                            className={styles.progressBg}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={styles.progressFill}
                            strokeDasharray={`${upload.progress}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                      </div>
                    )}
                    {upload.status === "success" && (
                      <div className={styles.successBadge}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    )}
                    {upload.status === "error" && (
                      <div className={styles.errorBadge} title={upload.error}>
                        !
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add more button */}
              <button
                className={styles.addBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            {/* Submit button */}
            {pendingCount > 0 && (
              <button
                className={styles.submitBtn}
                onClick={submitUploads}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className={styles.btnSpinner} />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload {pendingCount} Photo{pendingCount !== 1 ? "s" : ""}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hiddenInput}
        onChange={handleFileSelect}
      />
    </div>
  );
}
