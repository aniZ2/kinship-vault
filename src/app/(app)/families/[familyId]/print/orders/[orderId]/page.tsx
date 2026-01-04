// src/app/(app)/families/[familyId]/print/orders/[orderId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { formatMoney } from "@/lib/utils";
import styles from "@/components/PrintOrder/PrintOrder.module.css";

interface PrintOrder {
  id: string;
  familyId: string;
  compilationJobId: string;
  bookSize: string;
  coverType: string;
  pageCount: number;
  quantity: number;
  status: string;
  luluPrintJobId?: string;
  luluStatus?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingLevel: string;
  contactEmail?: string;
  createdAt?: { toDate: () => Date };
  submittedAt?: { toDate: () => Date };
  estimatedCost?: {
    printingCost: number;
    shippingCost: number;
    totalCostInclTax: number;
  };
  error?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  pending: { label: "Pending", icon: "clock", color: "#f59e0b" },
  submitted: { label: "Order Placed", icon: "check", color: "#10b981" },
  processing: { label: "Processing", icon: "cog", color: "#3b82f6" },
  printing: { label: "Printing", icon: "printer", color: "#8b5cf6" },
  shipped: { label: "Shipped", icon: "truck", color: "#10b981" },
  delivered: { label: "Delivered", icon: "package", color: "#10b981" },
  failed: { label: "Failed", icon: "x", color: "#ef4444" },
  cancelled: { label: "Cancelled", icon: "x", color: "#6b7280" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const familyId = params.familyId as string;
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<PrintOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId || !orderId || !db) {
      setLoading(false);
      return;
    }

    const orderRef = doc(db, `families/${familyId}/printOrders/${orderId}`);

    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setOrder({ id: snapshot.id, ...snapshot.data() } as PrintOrder);
        } else {
          setError("Order not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Order fetch error:", err);
        setError("Failed to load order");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [familyId, orderId]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className={styles.spinner} />
          Loading order...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#dc2626" }}>{error || "Order not found"}</div>
        <Link href={`/families/${familyId}/print`} style={{ color: "#7c3aed", marginTop: 12, display: "inline-block" }}>
          &larr; Back to Print
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Link href={`/families/${familyId}/print`} style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
            &larr; Back to Print
          </Link>
          <h1 style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 800 }}>
            Print Order
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className={styles.orderStatus}>
        <div className={styles.statusHeader}>
          <div
            className={`${styles.statusIcon} ${order.status === "failed" || order.status === "cancelled" ? styles.error : order.status === "pending" ? styles.pending : styles.success}`}
          >
            <StatusIcon status={order.status} />
          </div>
          <div>
            <h2 className={styles.statusTitle}>{statusInfo.label}</h2>
            <p className={styles.statusSubtitle}>
              {order.status === "submitted" && "Your order has been sent to the printer"}
              {order.status === "processing" && "Your book is being prepared"}
              {order.status === "printing" && "Your book is being printed"}
              {order.status === "shipped" && "Your book is on its way"}
              {order.status === "delivered" && "Your book has been delivered"}
              {order.status === "failed" && (order.error || "There was an issue with your order")}
              {order.status === "pending" && "Your order is being processed"}
            </p>
          </div>
        </div>

        {/* Tracking Info */}
        {order.trackingNumber && order.trackingUrl && (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.trackingLink}
          >
            <TruckIcon />
            Track Package: {order.trackingNumber}
          </a>
        )}
      </div>

      {/* Order Details */}
      <div className={styles.orderSummary} style={{ marginTop: 16 }}>
        <h3 className={styles.sectionTitle}>Order Details</h3>

        <div className={styles.orderDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Book Size</span>
            <span className={styles.detailValue}>
              {order.bookSize} {order.coverType === "hard" ? "Hardcover" : "Softcover"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Pages</span>
            <span className={styles.detailValue}>{order.pageCount} pages</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Quantity</span>
            <span className={styles.detailValue}>{order.quantity}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Shipping</span>
            <span className={styles.detailValue}>
              {order.shippingLevel === "EXPEDITED" ? "Expedited" : order.shippingLevel === "PRIORITY" ? "Priority" : order.shippingLevel === "GROUND" ? "Ground" : "Standard"}
            </span>
          </div>
          {order.createdAt && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Ordered</span>
              <span className={styles.detailValue}>
                {order.createdAt.toDate().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          {order.luluPrintJobId && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Lulu Order ID</span>
              <span className={styles.detailValue} style={{ fontFamily: "monospace", fontSize: 12 }}>
                {order.luluPrintJobId}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Shipping Address */}
      <div className={styles.orderSummary} style={{ marginTop: 16 }}>
        <h3 className={styles.sectionTitle}>Shipping Address</h3>

        <div className={styles.orderDetails}>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            <strong>{order.shippingAddress.name}</strong>
            <br />
            {order.shippingAddress.street1}
            {order.shippingAddress.street2 && (
              <>
                <br />
                {order.shippingAddress.street2}
              </>
            )}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            <br />
            {order.shippingAddress.country}
          </p>
        </div>
      </div>

      {/* Cost Summary */}
      {order.estimatedCost && (
        <div className={styles.orderSummary} style={{ marginTop: 16 }}>
          <h3 className={styles.sectionTitle}>Cost</h3>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Printing</span>
            <span className={styles.summaryValue}>
              {formatMoney(order.estimatedCost.printingCost)}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Shipping</span>
            <span className={styles.summaryValue}>
              {formatMoney(order.estimatedCost.shippingCost)}
            </span>
          </div>
          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span className={styles.summaryLabel}>Total</span>
            <span className={styles.summaryValue}>
              {formatMoney(order.estimatedCost.totalCostInclTax)}
            </span>
          </div>
        </div>
      )}

      {/* Contact */}
      {order.contactEmail && (
        <p style={{ marginTop: 24, fontSize: 13, color: "#6b7280", textAlign: "center" }}>
          Order updates will be sent to <strong>{order.contactEmail}</strong>
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "shipped":
    case "delivered":
      return <TruckIcon />;
    case "printing":
      return <PrinterIcon />;
    case "failed":
    case "cancelled":
      return <span>✕</span>;
    case "submitted":
    case "processing":
      return <span>✓</span>;
    default:
      return <span>◷</span>;
  }
}

function TruckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8Z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}
