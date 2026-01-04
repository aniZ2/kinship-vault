// src/components/BookCompiler/CompileBookButton.tsx
// Button to trigger book compilation with validation handling

"use client";

import { useState, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import { CompileProgress } from "./CompileProgress";
import styles from "./CompileBookButton.module.css";

type BookSize = "8x8" | "10x10" | "8.5x11";

interface ValidationWarning {
  pageId: string;
  pageTitle: string;
  criticalCount: number;
  warningCount: number;
}

interface ValidationResult {
  canProceed: boolean;
  summary: {
    pagesChecked: number;
    pagesWithIssues: number;
    totalCritical: number;
    totalWarnings: number;
    criticalPageIds: string[];
  };
  pageResults: ValidationWarning[];
}

interface CompileBookButtonProps {
  familyId: string;
  /** Specific page IDs to include, or undefined for all locked pages */
  pageIds?: string[];
  /** Book size */
  bookSize: BookSize;
  /** Called when compilation starts */
  onStart?: (jobId: string) => void;
  /** Called when compilation completes */
  onComplete?: (downloadUrl: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Custom button text */
  buttonText?: string;
  /** Disable the button */
  disabled?: boolean;
}

/**
 * Button that triggers book compilation with bleed validation
 *
 * Shows validation warnings before proceeding if issues are found.
 */
export function CompileBookButton({
  familyId,
  pageIds,
  bookSize,
  onStart,
  onComplete,
  onError,
  buttonText = "Compile Book",
  disabled = false,
}: CompileBookButtonProps) {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const startCompilation = useCallback(
    async (acknowledgeWarnings = false) => {
      if (loading || !auth?.currentUser) return;

      setLoading(true);
      setError(null);

      try {
        const idToken = await auth.currentUser.getIdToken();

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FUNCTIONS_URL}/compileBookInit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              familyId,
              bookSize,
              pageIds,
              acknowledgeWarnings,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          // Check if this is a validation failure
          if (response.status === 422 && data.status === "validation_failed") {
            setValidation(data.validation);
            setShowValidationModal(true);
            setLoading(false);
            return;
          }

          throw new Error(data.error?.message || "Failed to start compilation");
        }

        // Check if cached
        if (data.status === "cached") {
          if (data.downloadUrl) {
            onComplete?.(data.downloadUrl);
          }
          setJobId(data.jobId);
        } else {
          // New compilation started
          setJobId(data.jobId);
          onStart?.(data.jobId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        onError?.(message);
      } finally {
        setLoading(false);
      }
    },
    [familyId, bookSize, pageIds, loading, onStart, onComplete, onError]
  );

  const handleProceedWithWarnings = useCallback(() => {
    setShowValidationModal(false);
    setValidation(null);
    startCompilation(true);
  }, [startCompilation]);

  const handleCancelValidation = useCallback(() => {
    setShowValidationModal(false);
    setValidation(null);
  }, []);

  // If we have a job, show progress
  if (jobId) {
    return (
      <div className={styles.wrapper}>
        <CompileProgress
          familyId={familyId}
          jobId={jobId}
          onComplete={onComplete}
          onError={onError}
        />
        <button
          className={styles.cancelButton}
          onClick={() => setJobId(null)}
        >
          Start New
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.wrapper}>
        <button
          className={styles.compileButton}
          onClick={() => startCompilation(false)}
          disabled={disabled || loading}
        >
          {loading ? (
            <>
              <span className={styles.buttonSpinner} />
              Checking...
            </>
          ) : (
            <>
              <BookIcon />
              {buttonText}
            </>
          )}
        </button>

        {error && <p className={styles.errorText}>{error}</p>}
      </div>

      {/* Validation Modal */}
      {showValidationModal && validation && (
        <ValidationModal
          validation={validation}
          onProceed={handleProceedWithWarnings}
          onCancel={handleCancelValidation}
        />
      )}
    </>
  );
}

/**
 * Modal showing bleed validation warnings
 */
function ValidationModal({
  validation,
  onProceed,
  onCancel,
}: {
  validation: ValidationResult;
  onProceed: () => void;
  onCancel: () => void;
}) {
  const { summary, pageResults } = validation;
  const hasCritical = summary.totalCritical > 0;

  // Get pages with issues
  const pagesWithIssues = pageResults.filter(
    (p) => p.criticalCount > 0 || p.warningCount > 0
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div
          className={styles.modalHeader}
          data-severity={hasCritical ? "critical" : "warning"}
        >
          <div className={styles.modalIcon}>
            {hasCritical ? "!" : "i"}
          </div>
          <h2 className={styles.modalTitle}>
            {hasCritical ? "Content May Be Cut Off" : "Content Near Edges"}
          </h2>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalDesc}>
            {hasCritical
              ? `${summary.totalCritical} item${summary.totalCritical > 1 ? "s" : ""} are in the danger zone and may be cut off during printing.`
              : `${summary.totalWarnings} item${summary.totalWarnings > 1 ? "s" : ""} are close to the edge but should print OK.`}
          </p>

          {/* Affected pages */}
          <div className={styles.affectedPages}>
            <h3 className={styles.affectedTitle}>Affected Pages:</h3>
            <ul className={styles.pageList}>
              {pagesWithIssues.slice(0, 5).map((page) => (
                <li key={page.pageId} className={styles.pageItem}>
                  <span className={styles.pageName}>{page.pageTitle}</span>
                  {page.criticalCount > 0 && (
                    <span className={styles.criticalBadge}>
                      {page.criticalCount} critical
                    </span>
                  )}
                  {page.warningCount > 0 && (
                    <span className={styles.warningBadge}>
                      {page.warningCount} warning
                    </span>
                  )}
                </li>
              ))}
              {pagesWithIssues.length > 5 && (
                <li className={styles.morePages}>
                  +{pagesWithIssues.length - 5} more pages
                </li>
              )}
            </ul>
          </div>

          <p className={styles.recommendation}>
            {hasCritical
              ? "We recommend fixing these issues before printing. Move content away from the edges."
              : "The book will still compile. You can review and adjust if needed."}
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelModalButton} onClick={onCancel}>
            Go Back & Fix
          </button>
          <button
            className={styles.proceedButton}
            onClick={onProceed}
            data-severity={hasCritical ? "critical" : "warning"}
          >
            {hasCritical ? "Proceed Anyway" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
