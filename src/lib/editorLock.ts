// src/lib/editorLock.ts
// Utility module for scrapbook editor locking and localStorage backup

import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import type { EditorState } from "@/components/ScrapbookEditor";

// ============================================================================
// LOCALSTORAGE BACKUP
// ============================================================================

interface LocalStorageData {
  state: EditorState;
  savedAt: number; // Unix timestamp
}

/**
 * Generate localStorage key for a page
 */
export function getStorageKey(familyId: string, pageId: string): string {
  return `kv-editor-${familyId}-${pageId}`;
}

/**
 * Save editor state to localStorage
 */
export function saveToLocalStorage(
  familyId: string,
  pageId: string,
  state: EditorState
): void {
  try {
    const key = getStorageKey(familyId, pageId);
    const data: LocalStorageData = {
      state,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save to localStorage:", err);
  }
}

/**
 * Load editor state from localStorage
 */
export function loadFromLocalStorage(
  familyId: string,
  pageId: string
): LocalStorageData | null {
  try {
    const key = getStorageKey(familyId, pageId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as LocalStorageData;
  } catch (err) {
    console.warn("Failed to load from localStorage:", err);
    return null;
  }
}

/**
 * Check if localStorage has newer data than Firestore
 */
export function hasNewerLocalData(
  localData: LocalStorageData | null,
  firestoreUpdatedAt: Timestamp | null
): boolean {
  if (!localData) return false;
  if (!firestoreUpdatedAt) return true; // No Firestore timestamp means local is newer
  return localData.savedAt > firestoreUpdatedAt.toMillis();
}

/**
 * Clear localStorage for a page (after successful save)
 */
export function clearLocalStorage(familyId: string, pageId: string): void {
  try {
    const key = getStorageKey(familyId, pageId);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("Failed to clear localStorage:", err);
  }
}

// ============================================================================
// SESSION LOCKING
// ============================================================================

const SESSION_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface SessionLockResult {
  success: boolean;
  lockedBy?: string;
  lockedByName?: string;
  isAdminLocked?: boolean;
}

/**
 * Try to acquire a session lock on a page
 * Returns success: true if lock acquired, or info about who holds the lock
 */
export async function acquireSessionLock(
  familyId: string,
  pageId: string,
  uid: string,
  displayName: string
): Promise<SessionLockResult> {
  if (!db) {
    return { success: false };
  }

  const pageRef = doc(db, `families/${familyId}/pages/${pageId}`);
  const pageSnap = await getDoc(pageRef);

  if (!pageSnap.exists()) {
    return { success: false };
  }

  const data = pageSnap.data();

  // Check admin lock first
  if (data.isLocked === true) {
    return {
      success: false,
      isAdminLocked: true,
    };
  }

  // Check session lock
  const now = Date.now();
  const lockExpiresAt = data.lockExpiresAt?.toMillis?.() || 0;
  const currentLockedBy = data.lockedBy;

  // Lock is available if: no lock, we hold it, or it's expired
  const lockAvailable =
    !currentLockedBy ||
    currentLockedBy === uid ||
    lockExpiresAt < now;

  if (!lockAvailable) {
    return {
      success: false,
      lockedBy: currentLockedBy,
      lockedByName: data.lockedByName || "Another user",
    };
  }

  // Acquire the lock
  try {
    await updateDoc(pageRef, {
      lockedBy: uid,
      lockedByName: displayName,
      lockExpiresAt: Timestamp.fromMillis(now + SESSION_LOCK_DURATION_MS),
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to acquire session lock:", err);
    return { success: false };
  }
}

/**
 * Extend the session lock (call every 10 minutes while editing)
 */
export async function extendSessionLock(
  familyId: string,
  pageId: string,
  uid: string
): Promise<boolean> {
  if (!db) return false;

  const pageRef = doc(db, `families/${familyId}/pages/${pageId}`);

  try {
    const pageSnap = await getDoc(pageRef);
    if (!pageSnap.exists()) return false;

    const data = pageSnap.data();

    // Only extend if we still hold the lock
    if (data.lockedBy !== uid) {
      console.warn("Cannot extend lock - not the lock holder");
      return false;
    }

    await updateDoc(pageRef, {
      lockExpiresAt: Timestamp.fromMillis(Date.now() + SESSION_LOCK_DURATION_MS),
    });
    return true;
  } catch (err) {
    console.error("Failed to extend session lock:", err);
    return false;
  }
}

/**
 * Release the session lock (on save or exit)
 */
export async function releaseSessionLock(
  familyId: string,
  pageId: string,
  uid: string
): Promise<void> {
  if (!db) return;

  const pageRef = doc(db, `families/${familyId}/pages/${pageId}`);

  try {
    const pageSnap = await getDoc(pageRef);
    if (!pageSnap.exists()) return;

    const data = pageSnap.data();

    // Only release if we hold the lock
    if (data.lockedBy !== uid) {
      return;
    }

    await updateDoc(pageRef, {
      lockedBy: null,
      lockedByName: null,
      lockExpiresAt: null,
    });
  } catch (err) {
    console.error("Failed to release session lock:", err);
  }
}

// ============================================================================
// ADMIN LOCK (FREEZE)
// ============================================================================

/**
 * Check if a page is admin-locked
 */
export async function isPageAdminLocked(
  familyId: string,
  pageId: string
): Promise<boolean> {
  if (!db) return false;

  try {
    const pageSnap = await getDoc(doc(db, `families/${familyId}/pages/${pageId}`));
    if (!pageSnap.exists()) return false;
    return pageSnap.data().isLocked === true;
  } catch (err) {
    console.error("Failed to check admin lock:", err);
    return false;
  }
}

/**
 * Toggle admin lock on a page (owner/admin only)
 */
export async function toggleAdminLock(
  familyId: string,
  pageId: string,
  lock: boolean,
  adminUid: string
): Promise<boolean> {
  if (!db) return false;

  const pageRef = doc(db, `families/${familyId}/pages/${pageId}`);

  try {
    await updateDoc(pageRef, {
      isLocked: lock,
      lockedAt: lock ? serverTimestamp() : null,
      lockedByAdmin: lock ? adminUid : null,
      // Clear session lock when admin locks
      ...(lock && {
        lockedBy: null,
        lockedByName: null,
        lockExpiresAt: null,
      }),
    });
    return true;
  } catch (err) {
    console.error("Failed to toggle admin lock:", err);
    return false;
  }
}
