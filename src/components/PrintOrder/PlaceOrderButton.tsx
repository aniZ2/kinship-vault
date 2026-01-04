// src/components/PrintOrder/PlaceOrderButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import styles from "./PrintOrder.module.css";
import type { ShippingAddress } from "./ShippingAddressForm";
import type { CostBreakdown } from "./OrderSummary";
import type { CoverCustomizationData } from "./CoverCustomization";

type BookSize = "8x8" | "10x10" | "8.5x11";
type CoverType = "soft" | "hard";
type ShippingLevel = "MAIL" | "GROUND" | "PRIORITY" | "EXPEDITED";

interface PlaceOrderButtonProps {
  familyId: string;
  compilationJobId: string;
  r2Key: string;
  bookSize: BookSize;
  coverType: CoverType;
  pageCount: number;
  quantity: number;
  shippingAddress: ShippingAddress | null;
  shippingLevel: ShippingLevel;
  contactEmail: string;
  cost: CostBreakdown | null;
  isAddressValid: boolean;
  disabled?: boolean;
  coverDesign?: CoverCustomizationData | null;
}

export function PlaceOrderButton({
  familyId,
  compilationJobId,
  r2Key,
  bookSize,
  coverType,
  pageCount,
  quantity,
  shippingAddress,
  shippingLevel,
  contactEmail,
  cost,
  isAddressValid,
  disabled = false,
  coverDesign,
}: PlaceOrderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canOrder =
    isAddressValid &&
    contactEmail &&
    cost &&
    compilationJobId &&
    r2Key &&
    !disabled;

  const handlePlaceOrder = async () => {
    if (!canOrder || !auth?.currentUser || !shippingAddress) return;

    setLoading(true);
    setError(null);

    try {
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch("/api/print/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          familyId,
          compilationJobId,
          r2Key,
          bookSize,
          coverType,
          pageCount,
          quantity,
          shippingAddress,
          shippingLevel,
          contactEmail,
          // Cover design options
          familyName: coverDesign?.familyName,
          bookTitle: coverDesign?.bookTitle,
          primaryColor: coverDesign?.primaryColor,
          secondaryColor: coverDesign?.secondaryColor,
          coverMode: coverDesign?.coverMode,
          frontCoverImageUrl: coverDesign?.frontCoverImageUrl,
          wraparoundImageUrl: coverDesign?.wraparoundImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      // Redirect to order confirmation page
      router.push(`/families/${familyId}/print/orders/${data.orderId}`);
    } catch (err) {
      console.error("Place order error:", err);
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.placeOrderSection}>
      <button
        className={styles.placeOrderButton}
        onClick={handlePlaceOrder}
        disabled={!canOrder || loading}
      >
        {loading ? (
          <>
            <span className={styles.spinner} />
            Processing...
          </>
        ) : (
          <>
            <PrinterIcon />
            Place Print Order
          </>
        )}
      </button>

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12, textAlign: "center" }}>
          {error}
        </p>
      )}

      <p className={styles.disclaimer}>
        By placing this order, you agree to our terms of service.
        Your book will be printed and shipped by Lulu Press.
        Delivery times are estimates and may vary.
      </p>
    </div>
  );
}

function PrinterIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
