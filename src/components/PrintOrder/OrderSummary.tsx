// src/components/PrintOrder/OrderSummary.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import { formatMoney } from "@/lib/utils";
import styles from "./PrintOrder.module.css";
import type { ShippingAddress } from "./ShippingAddressForm";

type BookSize = "8x8" | "10x10" | "8.5x11";
type CoverType = "soft" | "hard";
type ShippingLevel = "MAIL" | "GROUND" | "PRIORITY" | "EXPEDITED";

interface OrderSummaryProps {
  familyId: string;
  bookSize: BookSize;
  coverType: CoverType;
  pageCount: number;
  quantity: number;
  shippingAddress: ShippingAddress | null;
  shippingLevel: ShippingLevel;
  onCostCalculated?: (cost: CostBreakdown | null) => void;
}

export interface CostBreakdown {
  currency: string;
  printingCost: number;
  shippingCost: number;
  totalCostExclTax: number;
  totalCostInclTax: number;
  tax: number;
}

const SHIPPING_OPTIONS: { level: ShippingLevel; name: string; time: string }[] = [
  { level: "MAIL", name: "Standard Mail", time: "7-21 business days" },
  { level: "GROUND", name: "Ground", time: "5-10 business days" },
  { level: "PRIORITY", name: "Priority", time: "3-7 business days" },
  { level: "EXPEDITED", name: "Expedited", time: "2-4 business days" },
];

// Base price estimates (Lulu API will provide exact pricing)
const BASE_PRICES: Record<BookSize, Record<CoverType, number>> = {
  "8x8": { soft: 12.5, hard: 22.5 },
  "10x10": { soft: 16.5, hard: 28.5 },
  "8.5x11": { soft: 14.5, hard: 25.5 },
};

const PRICE_PER_PAGE = 0.12; // Approximate per-page cost

export function OrderSummary({
  familyId,
  bookSize,
  coverType,
  pageCount,
  quantity,
  shippingAddress,
  shippingLevel,
  onCostCalculated,
}: OrderSummaryProps) {
  const [cost, setCost] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate cost from Lulu API
  const calculateCost = useCallback(async () => {
    if (!shippingAddress || !auth?.currentUser) {
      // Use estimate if no address yet
      const basePrice = BASE_PRICES[bookSize][coverType];
      const pagePrice = pageCount * PRICE_PER_PAGE;
      const unitPrice = basePrice + pagePrice;
      const subtotal = unitPrice * quantity;
      const shippingEstimate = shippingLevel === "MAIL" ? 5.99 : shippingLevel === "GROUND" ? 8.99 : shippingLevel === "PRIORITY" ? 14.99 : 24.99;

      const estimate: CostBreakdown = {
        currency: "USD",
        printingCost: subtotal,
        shippingCost: shippingEstimate,
        totalCostExclTax: subtotal + shippingEstimate,
        totalCostInclTax: subtotal + shippingEstimate,
        tax: 0,
      };
      setCost(estimate);
      onCostCalculated?.(estimate);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch("/api/print/calculate-cost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          familyId,
          bookSize,
          coverType,
          pageCount,
          quantity,
          shippingAddress,
          shippingLevel,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to calculate cost");
      }

      const data = await response.json();
      setCost(data);
      onCostCalculated?.(data);
    } catch (err) {
      console.error("Cost calculation error:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate cost");

      // Fall back to estimate
      const basePrice = BASE_PRICES[bookSize][coverType];
      const pagePrice = pageCount * PRICE_PER_PAGE;
      const unitPrice = basePrice + pagePrice;
      const subtotal = unitPrice * quantity;
      const shippingEstimate = 9.99;

      const estimate: CostBreakdown = {
        currency: "USD",
        printingCost: subtotal,
        shippingCost: shippingEstimate,
        totalCostExclTax: subtotal + shippingEstimate,
        totalCostInclTax: subtotal + shippingEstimate,
        tax: 0,
      };
      setCost(estimate);
      onCostCalculated?.(estimate);
    } finally {
      setLoading(false);
    }
  }, [familyId, bookSize, coverType, pageCount, quantity, shippingAddress, shippingLevel, onCostCalculated]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateCost();
  }, [calculateCost]);

  const isEstimate = !shippingAddress;

  return (
    <div className={styles.orderSummary}>
      <h3 className={styles.sectionTitle}>Order Summary</h3>

      {loading ? (
        <div className={styles.loadingCost}>
          <div className={styles.spinner} />
          Calculating...
        </div>
      ) : (
        <>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              {bookSize} {coverType === "hard" ? "Hardcover" : "Softcover"}
            </span>
            <span className={styles.summaryValue}>
              {formatMoney(BASE_PRICES[bookSize][coverType])}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              {pageCount} pages
            </span>
            <span className={styles.summaryValue}>
              +{formatMoney(pageCount * PRICE_PER_PAGE)}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              Quantity: {quantity}
            </span>
            <span className={styles.summaryValue}>
              ×{quantity}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Printing</span>
            <span className={styles.summaryValue}>
              {cost ? formatMoney(cost.printingCost) : "—"}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              Shipping ({SHIPPING_OPTIONS.find(o => o.level === shippingLevel)?.name})
            </span>
            <span className={styles.summaryValue}>
              {cost ? formatMoney(cost.shippingCost) : "—"}
            </span>
          </div>

          {cost && cost.tax > 0 && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Tax</span>
              <span className={styles.summaryValue}>
                {formatMoney(cost.tax)}
              </span>
            </div>
          )}

          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span className={styles.summaryLabel}>
              Total {isEstimate && "(estimate)"}
            </span>
            <span className={styles.summaryValue}>
              {cost ? formatMoney(cost.totalCostInclTax) : "—"}
            </span>
          </div>

          {error && (
            <p style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>
              {error} (showing estimate)
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Shipping level selector component
export function ShippingLevelSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: ShippingLevel;
  onChange: (level: ShippingLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.shippingOptions}>
      <h3 className={styles.sectionTitle}>Shipping Speed</h3>
      <div className={styles.optionsList}>
        {SHIPPING_OPTIONS.map((option) => (
          <label
            key={option.level}
            className={`${styles.optionCard} ${value === option.level ? styles.selected : ""}`}
          >
            <input
              type="radio"
              name="shippingLevel"
              value={option.level}
              checked={value === option.level}
              onChange={() => onChange(option.level)}
              disabled={disabled}
            />
            <div className={styles.optionInfo}>
              <div className={styles.optionName}>{option.name}</div>
              <div className={styles.optionTime}>{option.time}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
