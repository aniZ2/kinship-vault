// src/app/(app)/families/[familyId]/qr/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import QRCode from "qrcode";
import styles from "./qr.module.css";

interface FamilyData {
  name?: string;
  uploadSecret?: string;
}

// Generate a cryptographically secure upload secret
function generateUploadSecret(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function QRCodePage() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [family, setFamily] = useState<FamilyData | null>(null);
  const [uploadSecret, setUploadSecret] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Generate the upload URL with secret
  const uploadUrl = typeof window !== "undefined" && uploadSecret
    ? `${window.location.origin}/upload/${familyId}?s=${uploadSecret}`
    : "";

  // Fetch family data and ensure upload secret exists
  useEffect(() => {
    if (!familyId || !db) return;
    (async () => {
      const familyRef = doc(db, `families/${familyId}`);
      const snap = await getDoc(familyRef);
      if (snap.exists()) {
        const data = snap.data() as FamilyData;
        setFamily(data);

        // Generate upload secret if it doesn't exist
        if (data.uploadSecret) {
          setUploadSecret(data.uploadSecret);
        } else {
          const newSecret = generateUploadSecret();
          try {
            await updateDoc(familyRef, { uploadSecret: newSecret });
            setUploadSecret(newSecret);
          } catch (err) {
            console.error("Failed to generate upload secret:", err);
          }
        }
      } else {
        router.replace("/families");
        return;
      }
      setLoading(false);
    })();
  }, [familyId, router]);

  // Generate QR code
  useEffect(() => {
    if (!uploadUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, uploadUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#1f2937",
        light: "#ffffff",
      },
    });
  }, [uploadUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(uploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = uploadUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${family?.name || "family"}-upload-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !canvasRef.current) return;

    const qrDataUrl = canvasRef.current.toDataURL("image/png");
    const familyName = family?.name || "Family";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${familyName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .container {
              text-align: center;
              max-width: 400px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
              color: #1f2937;
            }
            p {
              color: #6b7280;
              margin-bottom: 24px;
              font-size: 14px;
            }
            img {
              max-width: 280px;
              margin-bottom: 16px;
            }
            .url {
              font-size: 12px;
              color: #9ca3af;
              word-break: break-all;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Share Photos with ${familyName}</h1>
            <p>Scan this QR code to upload photos</p>
            <img src="${qrDataUrl}" alt="QR Code" />
            <div class="url">${uploadUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading || !db) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={`/families/${familyId}/story`} className={styles.backLink}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Story
        </Link>
        <h1 className={styles.title}>Guest Photo Upload</h1>
        <p className={styles.subtitle}>
          Share this QR code at events so guests can upload photos directly to your family story
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.qrCard}>
          <div className={styles.qrHeader}>
            <span className={styles.familyName}>{family?.name || "Family"}</span>
            <span className={styles.badge}>Scan to Upload</span>
          </div>

          <div className={styles.qrWrapper}>
            <canvas ref={canvasRef} className={styles.qrCanvas} />
          </div>

          <div className={styles.urlDisplay}>
            <input
              type="text"
              value={uploadUrl}
              readOnly
              className={styles.urlInput}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button onClick={handleCopyLink} className={styles.copyBtn}>
              {copied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={handleDownload} className={styles.actionBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download QR Code
          </button>
          <button onClick={handlePrint} className={styles.actionBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print QR Code
          </button>
        </div>

        <div className={styles.infoCard}>
          <h3>How it works</h3>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNum}>1</span>
              <span>Print or display this QR code at your event</span>
            </li>
            <li>
              <span className={styles.stepNum}>2</span>
              <span>Guests scan the code with their phone camera</span>
            </li>
            <li>
              <span className={styles.stepNum}>3</span>
              <span>They upload photos - no account needed</span>
            </li>
            <li>
              <span className={styles.stepNum}>4</span>
              <span>You review and approve uploads in the moderation queue</span>
            </li>
          </ol>
          <Link href={`/families/${familyId}/moderate`} className={styles.moderateLink}>
            Go to Moderation Dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
