// src/hooks/useCompilationJob.ts
// Real-time hook for tracking book compilation job status

import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/**
 * Bleed validation warning for a single page
 */
export interface PageWarning {
  pageId: string;
  pageTitle: string;
  validatedAt: string;
  itemsWithIssues: number;
  criticalCount: number;
  warningCount: number;
  details?: Array<{
    itemId: string;
    itemType: string;
    hasWarnings: boolean;
    hasCritical: boolean;
    warnings: Array<{
      edge: string;
      severity: "critical" | "warning" | "info";
      message: string;
      distancePx: number;
    }>;
  }>;
}

/**
 * Bleed validation record stored with the job
 */
export interface BleedValidation {
  validatedAt: string;
  passed: boolean;
  userProceeded: boolean;
  userProceededAt?: string;
  userProceededBy?: string;
  summary: {
    pagesChecked: number;
    pagesWithIssues: number;
    totalCritical: number;
    totalWarnings: number;
    criticalPageIds: string[];
  };
  pages: PageWarning[];
  message: string;
}

/**
 * Compilation job status
 */
export type JobStatus =
  | "pending"
  | "validating"
  | "rendering"
  | "merging"
  | "complete"
  | "failed";

/**
 * Compilation job document
 */
export interface CompilationJob {
  id: string;
  familyId: string;
  familyName: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Configuration
  bookSize: "8x8" | "10x10" | "8.5x11";
  bleedInches: number;
  pageIds: string[];

  // Progress
  status: JobStatus;
  pagesRendered: number;
  totalPages: number;
  currentBatch: number;

  // Validation (always persisted)
  bleedValidation: BleedValidation;

  // Output
  r2Key: string | null;
  downloadUrl: string | null;
  downloadExpiresAt: string | null;
  fileSizeBytes: number | null;
  finalPageCount?: number;
  completedAt?: Timestamp;

  // Error tracking
  errorMessage: string | null;
  failedPageId: string | null;
}

/**
 * Hook return type
 */
export interface UseCompilationJobReturn {
  /** The compilation job data */
  job: CompilationJob | null;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the job is complete */
  isComplete: boolean;
  /** Whether the job failed */
  isFailed: boolean;
  /** Whether the job is in progress */
  isInProgress: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current status label for display */
  statusLabel: string;
  /** Download URL (may need refresh if expired) */
  downloadUrl: string | null;
  /** Whether the download URL has expired */
  isDownloadExpired: boolean;
  /** Refresh the download URL */
  refreshDownloadUrl: () => Promise<void>;
}

/**
 * Get a human-readable status label
 */
function getStatusLabel(status: JobStatus, pagesRendered: number, totalPages: number): string {
  switch (status) {
    case "pending":
      return "Preparing...";
    case "validating":
      return "Validating pages...";
    case "rendering":
      return `Rendering page ${pagesRendered + 1} of ${totalPages}...`;
    case "merging":
      return "Assembling book...";
    case "complete":
      return "Complete!";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

/**
 * Check if a download URL has expired
 */
function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  try {
    return new Date(expiresAt) < new Date();
  } catch {
    return true;
  }
}

/**
 * Hook to track a compilation job in real-time
 *
 * @param familyId - The family ID
 * @param jobId - The compilation job ID
 * @returns Job status and utilities
 *
 * @example
 * ```tsx
 * const { job, isComplete, progress, statusLabel, downloadUrl } = useCompilationJob(familyId, jobId);
 *
 * if (isComplete) {
 *   return <a href={downloadUrl}>Download Book</a>;
 * }
 *
 * return <ProgressBar value={progress} label={statusLabel} />;
 * ```
 */
export function useCompilationJob(
  familyId: string | null | undefined,
  jobId: string | null | undefined
): UseCompilationJobReturn {
  const [job, setJob] = useState<CompilationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to job document
  useEffect(() => {
    if (!familyId || !jobId || !db) {
      setJob(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const jobRef = doc(db, `families/${familyId}/compilationJobs/${jobId}`);

    const unsubscribe = onSnapshot(
      jobRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setJob({ id: snapshot.id, ...snapshot.data() } as CompilationJob);
        } else {
          setJob(null);
          setError("Job not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error watching compilation job:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId, jobId]);

  // Refresh download URL
  const refreshDownloadUrl = useCallback(async () => {
    if (!familyId || !jobId || refreshing) return;

    setRefreshing(true);
    try {
      const response = await fetch("/api/book/refresh-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, jobId }),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh download URL");
      }

      // The Firestore listener will pick up the update
    } catch (err) {
      console.error("Error refreshing download URL:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [familyId, jobId, refreshing]);

  // Computed values
  const isComplete = job?.status === "complete";
  const isFailed = job?.status === "failed";
  const isInProgress = job
    ? ["pending", "validating", "rendering", "merging"].includes(job.status)
    : false;

  const progress = job
    ? job.status === "complete"
      ? 100
      : job.status === "merging"
        ? 95
        : job.totalPages > 0
          ? Math.round((job.pagesRendered / job.totalPages) * 90)
          : 0
    : 0;

  const statusLabel = job
    ? getStatusLabel(job.status, job.pagesRendered, job.totalPages)
    : "Loading...";

  const downloadUrl = job?.downloadUrl || null;
  const isDownloadExpired = isExpired(job?.downloadExpiresAt || null);

  return {
    job,
    loading,
    error,
    isComplete,
    isFailed,
    isInProgress,
    progress,
    statusLabel,
    downloadUrl,
    isDownloadExpired,
    refreshDownloadUrl,
  };
}

/**
 * Hook to list all compilation jobs for a family
 */
export function useCompilationJobs(familyId: string | null | undefined) {
  const [jobs, setJobs] = useState<CompilationJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !db) {
      setJobs([]);
      setLoading(false);
      return;
    }
    const firestore = db; // Capture for async closure

    setLoading(true);

    // Import dynamically to avoid issues
    import("firebase/firestore").then(({ collection, query, orderBy, onSnapshot: snap }) => {
      const jobsRef = collection(firestore, `families/${familyId}/compilationJobs`);
      const q = query(jobsRef, orderBy("createdAt", "desc"));

      const unsubscribe = snap(q, (snapshot) => {
        setJobs(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CompilationJob))
        );
        setLoading(false);
      });

      return () => unsubscribe();
    });
  }, [familyId]);

  return { jobs, loading };
}
