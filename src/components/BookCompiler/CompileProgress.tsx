// src/components/BookCompiler/CompileProgress.tsx
// Progress UI for book compilation jobs

"use client";

import { useCompilationJob, BleedValidation } from "@/hooks/useCompilationJob";
import styles from "./CompileProgress.module.css";

interface CompileProgressProps {
  familyId: string;
  jobId: string;
  onComplete?: (downloadUrl: string) => void;
  onError?: (error: string) => void;
}

/**
 * Displays real-time progress for a book compilation job
 */
export function CompileProgress({
  familyId,
  jobId,
  onComplete,
  onError,
}: CompileProgressProps) {
  const {
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
  } = useCompilationJob(familyId, jobId);

  // Notify parent on completion
  if (isComplete && downloadUrl && onComplete) {
    onComplete(downloadUrl);
  }

  // Notify parent on error
  if (isFailed && error && onError) {
    onError(error);
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.status}>Loading...</p>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className={styles.container}>
        <div className={styles.errorIcon}>!</div>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Progress bar */}
      <div className={styles.progressWrapper}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
            data-status={job.status}
          />
        </div>
        <span className={styles.progressText}>{progress}%</span>
      </div>

      {/* Status label */}
      <p className={styles.status} data-status={job.status}>
        {statusLabel}
      </p>

      {/* Page count */}
      {isInProgress && (
        <p className={styles.pageCount}>
          {job.pagesRendered} of {job.totalPages} pages rendered
        </p>
      )}

      {/* Bleed warnings summary */}
      {job.bleedValidation && job.bleedValidation.summary.totalWarnings > 0 && (
        <BleedWarningsSummary validation={job.bleedValidation} />
      )}

      {/* Error message */}
      {isFailed && job.errorMessage && (
        <div className={styles.errorBox}>
          <strong>Error:</strong> {job.errorMessage}
          {job.failedPageId && (
            <span className={styles.failedPage}>
              (Page: {job.failedPageId})
            </span>
          )}
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <div className={styles.completeBox}>
          <div className={styles.checkmark}>&#10003;</div>
          <div className={styles.completeInfo}>
            <p className={styles.completeTitle}>Book Ready!</p>
            <p className={styles.completeDetails}>
              {job.finalPageCount} pages &middot;{" "}
              {job.fileSizeBytes
                ? `${(job.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`
                : ""}
            </p>

            {downloadUrl && !isDownloadExpired ? (
              <a
                href={downloadUrl}
                download={`${job.familyName || "book"}-${job.bookSize}.pdf`}
                className={styles.downloadButton}
              >
                Download PDF
              </a>
            ) : (
              <button
                onClick={refreshDownloadUrl}
                className={styles.refreshButton}
              >
                Get Download Link
              </button>
            )}
          </div>
        </div>
      )}

      {/* Book info */}
      <div className={styles.bookInfo}>
        <span className={styles.bookSize}>{job.bookSize}</span>
        <span className={styles.bookPages}>{job.totalPages} pages</span>
      </div>
    </div>
  );
}

/**
 * Summary of bleed warnings
 */
function BleedWarningsSummary({ validation }: { validation: BleedValidation }) {
  const { summary, userProceeded } = validation;

  if (summary.totalCritical === 0 && summary.totalWarnings === 0) {
    return null;
  }

  return (
    <div
      className={styles.warningsBox}
      data-severity={summary.totalCritical > 0 ? "critical" : "warning"}
    >
      <div className={styles.warningsIcon}>
        {summary.totalCritical > 0 ? "!" : "i"}
      </div>
      <div className={styles.warningsContent}>
        <p className={styles.warningsTitle}>
          {summary.totalCritical > 0
            ? `${summary.totalCritical} critical issue${summary.totalCritical > 1 ? "s" : ""}`
            : `${summary.totalWarnings} warning${summary.totalWarnings > 1 ? "s" : ""}`}
        </p>
        <p className={styles.warningsDesc}>
          {summary.totalCritical > 0
            ? "Content may be cut off during printing."
            : "Content is close to edges but should print OK."}
        </p>
        {userProceeded && (
          <p className={styles.warningsAcknowledged}>
            User acknowledged and proceeded
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Compact progress indicator for inline use
 */
export function CompileProgressInline({
  familyId,
  jobId,
}: {
  familyId: string;
  jobId: string;
}) {
  const { progress, statusLabel, isComplete, isFailed } = useCompilationJob(
    familyId,
    jobId
  );

  return (
    <div className={styles.inline}>
      <div className={styles.inlineBar}>
        <div
          className={styles.inlineFill}
          style={{ width: `${progress}%` }}
          data-complete={isComplete}
          data-failed={isFailed}
        />
      </div>
      <span className={styles.inlineLabel}>{statusLabel}</span>
    </div>
  );
}
