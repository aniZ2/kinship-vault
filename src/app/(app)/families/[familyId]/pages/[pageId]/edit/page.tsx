// src/app/(app)/families/[familyId]/pages/[pageId]/edit/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";
import { ScrapbookEditor, EditorState, StorageInfo } from "@/components/ScrapbookEditor";
import { LIMITS } from "@/lib/stripe/products";
import {
  acquireSessionLock,
  releaseSessionLock,
  extendSessionLock,
  loadFromLocalStorage,
  hasNewerLocalData,
  clearLocalStorage,
  saveToLocalStorage,
} from "@/lib/editorLock";
import { RecoveryDialog } from "@/components/RecoveryDialog/RecoveryDialog";
import { Timestamp } from "firebase/firestore";

interface PageData {
  id: string;
  title?: string;
  state?: EditorState;
  isLocked?: boolean;
  lockedBy?: string;
  lockedByName?: string;
  updatedAt?: Timestamp;
}

interface FamilyData {
  subscription?: {
    type: "free" | "pro";
  };
  storageUsedBytes?: number;
}

interface MembershipData {
  role: "owner" | "admin" | "member";
}

type LockStatus = "loading" | "acquired" | "blocked" | "admin-frozen";

export default function PageEditRoute() {
  const params = useParams();
  const router = useRouter();
  const familyId = params.familyId as string;
  const pageId = params.pageId as string;

  const { currentUser, userProfile } = useAuth();

  const [page, setPage] = useState<PageData | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Lock state
  const [lockStatus, setLockStatus] = useState<LockStatus>("loading");
  const [blockedByName, setBlockedByName] = useState<string | null>(null);

  // Recovery state
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveryData, setRecoveryData] = useState<EditorState | null>(null);
  const [recoveryTimestamp, setRecoveryTimestamp] = useState<Date | null>(null);
  const [useRecoveredData, setUseRecoveredData] = useState(false);

  // Track if we acquired the lock (for cleanup)
  const lockAcquiredRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch page and family data
  useEffect(() => {
    if (!familyId || !pageId || !db || !currentUser) return;

    (async () => {
      setLoading(true);

      const [pageSnap, familySnap] = await Promise.all([
        getDoc(doc(db, `families/${familyId}/pages/${pageId}`)),
        getDoc(doc(db, `families/${familyId}`)),
      ]);

      const pageData = pageSnap.exists()
        ? ({ id: pageSnap.id, ...pageSnap.data() } as PageData)
        : null;
      setPage(pageData);

      if (familySnap.exists()) {
        const familyData = familySnap.data() as FamilyData;
        const isPro = familyData.subscription?.type === "pro";
        setStorageInfo({
          usedBytes: familyData.storageUsedBytes || 0,
          limitBytes: isPro ? Infinity : LIMITS.storagePerFamily.free,
          isPro,
        });
      }

      // Check locks
      if (pageData) {
        // Check admin lock first
        if (pageData.isLocked === true) {
          setLockStatus("admin-frozen");
          setLoading(false);
          return;
        }

        // Try to acquire session lock
        const displayName =
          userProfile?.displayName ||
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "User";

        const lockResult = await acquireSessionLock(
          familyId,
          pageId,
          currentUser.uid,
          displayName
        );

        if (lockResult.success) {
          setLockStatus("acquired");
          lockAcquiredRef.current = true;

          // Check for localStorage recovery data
          const localData = loadFromLocalStorage(familyId, pageId);
          if (localData && hasNewerLocalData(localData, pageData.updatedAt || null)) {
            setRecoveryData(localData.state);
            setRecoveryTimestamp(new Date(localData.savedAt));
            setShowRecoveryDialog(true);
          }
        } else if (lockResult.isAdminLocked) {
          setLockStatus("admin-frozen");
        } else {
          setLockStatus("blocked");
          setBlockedByName(lockResult.lockedByName || "Another user");
        }
      }

      setLoading(false);
    })();
  }, [familyId, pageId, currentUser, userProfile]);

  // Extend lock periodically (every 10 minutes)
  useEffect(() => {
    if (lockStatus !== "acquired" || !currentUser) return;

    const interval = setInterval(() => {
      extendSessionLock(familyId, pageId, currentUser.uid);
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [lockStatus, familyId, pageId, currentUser]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (lockAcquiredRef.current && currentUser) {
        releaseSessionLock(familyId, pageId, currentUser.uid);
      }
    };
  }, [familyId, pageId, currentUser]);

  // Handle recovery dialog actions
  const handleRestoreRecovery = useCallback(() => {
    setUseRecoveredData(true);
    setShowRecoveryDialog(false);
  }, []);

  const handleDiscardRecovery = useCallback(() => {
    clearLocalStorage(familyId, pageId);
    setRecoveryData(null);
    setShowRecoveryDialog(false);
  }, [familyId, pageId]);

  // Callback for editor to save to localStorage
  const handleStateChange = useCallback(
    (state: EditorState) => {
      saveToLocalStorage(familyId, pageId, state);
    },
    [familyId, pageId]
  );

  // Callback for when editor saves successfully
  const handleSaveComplete = useCallback(() => {
    clearLocalStorage(familyId, pageId);
    if (currentUser) {
      releaseSessionLock(familyId, pageId, currentUser.uid);
      lockAcquiredRef.current = false;
    }
  }, [familyId, pageId, currentUser]);

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
        Page not found.{" "}
        <Link href={`/families/${familyId}/story`}>Back to Family Story</Link>
      </div>
    );
  }

  // Admin frozen state
  if (lockStatus === "admin-frozen") {
    return (
      <div style={{ padding: 48, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ marginBottom: 8 }}>Page is Locked</h2>
        <p style={{ color: "#666", marginBottom: 24 }}>
          This page has been locked by an admin and cannot be edited.
        </p>
        <Link
          href={`/families/${familyId}/story`}
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "#111",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Back to Story
        </Link>
      </div>
    );
  }

  // Session blocked state
  if (lockStatus === "blocked") {
    return (
      <div style={{ padding: 48, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
        <h2 style={{ marginBottom: 8 }}>Page is Being Edited</h2>
        <p style={{ color: "#666", marginBottom: 24 }}>
          <strong>{blockedByName}</strong> is currently editing this page. Please try
          again later.
        </p>
        <Link
          href={`/families/${familyId}/story`}
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "#111",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Back to Story
        </Link>
      </div>
    );
  }

  // Determine initial state (use recovered data if user chose to restore)
  const initialState = useRecoveredData && recoveryData ? recoveryData : page.state;

  return (
    <>
      <RecoveryDialog
        isOpen={showRecoveryDialog}
        onRestore={handleRestoreRecovery}
        onDiscard={handleDiscardRecovery}
        localTimestamp={recoveryTimestamp}
      />
      <ScrapbookEditor
        mode="edit"
        initialState={initialState}
        storageInfo={storageInfo}
        onStateChange={handleStateChange}
        onSaveComplete={handleSaveComplete}
      />
    </>
  );
}
