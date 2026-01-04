// src/components/RecoveryDialog/RecoveryDialog.tsx
"use client";

import styles from "./RecoveryDialog.module.css";

interface RecoveryDialogProps {
  isOpen: boolean;
  onRestore: () => void;
  onDiscard: () => void;
  localTimestamp: Date | null;
}

export function RecoveryDialog({
  isOpen,
  onRestore,
  onDiscard,
  localTimestamp,
}: RecoveryDialogProps) {
  if (!isOpen) return null;

  const formattedTime = localTimestamp
    ? localTimestamp.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Unknown time";

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.icon}>📝</div>
        <h2 className={styles.title}>Recovered Unsaved Work</h2>
        <p className={styles.description}>
          We found unsaved changes from <strong>{formattedTime}</strong>.
        </p>
        <p className={styles.question}>Would you like to restore them?</p>
        <div className={styles.actions}>
          <button onClick={onDiscard} className={styles.discardBtn}>
            Discard
          </button>
          <button onClick={onRestore} className={styles.restoreBtn}>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
