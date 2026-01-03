// src/components/StorageIndicator/StorageIndicator.tsx
"use client";

import { formatBytes, getStoragePercentage, isNearStorageLimit, isAtStorageLimit } from '@/lib/stripe/products';
import styles from './StorageIndicator.module.css';

interface StorageIndicatorProps {
  usedBytes: number;
  limitBytes: number;
  isPro?: boolean;
  compact?: boolean;
}

export default function StorageIndicator({ usedBytes, limitBytes, isPro = false, compact = false }: StorageIndicatorProps) {
  const percentage = getStoragePercentage(usedBytes, limitBytes);
  const isNearLimit = isNearStorageLimit(usedBytes, limitBytes);
  const isAtLimit = isAtStorageLimit(usedBytes, limitBytes);

  const getStatusClass = () => {
    if (isPro) return styles.pro;
    if (isAtLimit) return styles.full;
    if (isNearLimit) return styles.warning;
    return styles.normal;
  };

  if (compact) {
    return (
      <div className={`${styles.compact} ${getStatusClass()}`}>
        <div className={styles.compactBar}>
          <div
            className={styles.compactFill}
            style={{ width: isPro ? '0%' : `${percentage}%` }}
          />
        </div>
        <span className={styles.compactText}>
          {formatBytes(usedBytes)}
          {!isPro && ` / ${formatBytes(limitBytes)}`}
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${getStatusClass()}`}>
      <div className={styles.header}>
        <span className={styles.label}>Storage</span>
        {isPro && <span className={styles.proBadge}>Pro</span>}
      </div>
      <div className={styles.bar}>
        <div
          className={styles.fill}
          style={{ width: isPro ? '0%' : `${percentage}%` }}
        />
      </div>
      <div className={styles.info}>
        <span className={styles.used}>{formatBytes(usedBytes)} used</span>
        {isPro ? (
          <span className={styles.unlimited}>Unlimited</span>
        ) : (
          <span className={styles.limit}>{formatBytes(limitBytes)} limit</span>
        )}
      </div>
      {isAtLimit && !isPro && (
        <div className={styles.warningMessage}>
          Storage full. Upgrade to Pro for unlimited storage.
        </div>
      )}
      {isNearLimit && !isAtLimit && !isPro && (
        <div className={styles.warningMessage}>
          Storage nearly full ({percentage}% used)
        </div>
      )}
    </div>
  );
}
