// src/app/(app)/settings/billing/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import {
  PRICING,
  LIMITS,
  isSubscriptionActive,
  type UserSubscription,
} from "@/lib/stripe/products";
import "@/styles/billing.css";

type BillingPeriod = "monthly" | "annual";

interface UserData {
  displayName?: string;
  stripeCustomerId?: string;
  userProSubscription?: UserSubscription;
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="billing-wrap">
          <div className="billing-paper" style={{ textAlign: "center", padding: "4rem" }}>
            Loading...
          </div>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("annual");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setMsg("Subscription activated successfully!");
    } else if (searchParams.get("canceled") === "true") {
      setErr("Checkout was canceled.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.push("/signin");
        return;
      }
      setUser(u);

      if (!db) return;

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          setUserData(snap.data() as UserData);
        }
      } catch (e) {
        console.error("Error loading user data:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const hasUserPro = userData?.userProSubscription
    ? isSubscriptionActive(userData.userProSubscription.status)
    : false;

  async function handleUpgrade(type: "user_pro" | "family_pro") {
    if (!user || !auth?.currentUser) return;

    try {
      setBusy(type);
      setErr("");
      setMsg("");

      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type,
          billingPeriod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleManageBilling() {
    if (!user || !auth?.currentUser) return;

    try {
      setBusy("portal");
      setErr("");

      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="billing-wrap">
        <div className="billing-paper" style={{ textAlign: "center", padding: "4rem" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="billing-wrap">
      <div className="billing-paper">
        <header className="billing-hero">
          <div className="hero-left">
            <h1 className="hero-title">Billing & Plans</h1>
            <p className="hero-sub">Upgrade to unlock more families, members, and storage.</p>
          </div>
          <div className="hero-right">
            <button className="btn link" onClick={() => router.push("/families")}>
              Back to Family Gate
            </button>
          </div>
        </header>

        {(msg || err) && (
          <div className={`ribbon ${err ? "ribbon-error" : "ribbon-ok"}`}>{err || msg}</div>
        )}

        {/* Current Plan */}
        <section className="card">
          <div className="card-title">
            <h2>Current Plan</h2>
          </div>
          <div className="current-plan">
            <div className="plan-badge">
              {hasUserPro ? (
                <span className="badge pro">User Pro</span>
              ) : (
                <span className="badge free">Free</span>
              )}
            </div>
            <div className="plan-details">
              <p>
                <strong>Family limit:</strong>{" "}
                {hasUserPro ? LIMITS.familiesPerUser.user_pro : LIMITS.familiesPerUser.free} families
              </p>
              {hasUserPro && userData?.userProSubscription && (
                <>
                  <p>
                    <strong>Renews:</strong>{" "}
                    {new Date(userData.userProSubscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                  {userData.userProSubscription.cancelAtPeriodEnd && (
                    <p className="cancel-notice">Cancels at end of period</p>
                  )}
                </>
              )}
            </div>
            {userData?.stripeCustomerId && (
              <button
                className="btn"
                onClick={handleManageBilling}
                disabled={busy === "portal"}
              >
                {busy === "portal" ? "Opening..." : "Manage Billing"}
              </button>
            )}
          </div>
        </section>

        {/* Billing Period Toggle */}
        <div className="period-toggle">
          <button
            className={`toggle-btn ${billingPeriod === "monthly" ? "active" : ""}`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${billingPeriod === "annual" ? "active" : ""}`}
            onClick={() => setBillingPeriod("annual")}
          >
            Annual
            <span className="save-badge">Save 17%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {/* User Pro */}
          <div className={`pricing-card ${hasUserPro ? "current" : ""}`}>
            <div className="pricing-header">
              <h3>User Pro</h3>
              <p className="pricing-desc">For individuals in multiple families</p>
            </div>
            <div className="pricing-price">
              <span className="price-amount">
                ${billingPeriod === "annual" ? PRICING.userPro.annual : PRICING.userPro.monthly}
              </span>
              <span className="price-period">
                /{billingPeriod === "annual" ? "year" : "month"}
              </span>
            </div>
            {billingPeriod === "annual" && (
              <p className="price-savings">Save ${PRICING.userPro.annualSavings}/year</p>
            )}
            <ul className="pricing-features">
              <li>Join up to <strong>5 families</strong></li>
              <li>Priority support</li>
              <li>Early access to new features</li>
            </ul>
            {hasUserPro ? (
              <button className="btn current-btn" disabled>
                Current Plan
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={() => handleUpgrade("user_pro")}
                disabled={busy === "user_pro"}
              >
                {busy === "user_pro" ? "Processing..." : "Upgrade to User Pro"}
              </button>
            )}
          </div>

          {/* Family Pro */}
          <div className="pricing-card featured">
            <div className="featured-badge">Most Popular</div>
            <div className="pricing-header">
              <h3>Family Pro</h3>
              <p className="pricing-desc">For larger families with more memories</p>
            </div>
            <div className="pricing-price">
              <span className="price-amount">
                ${billingPeriod === "annual" ? PRICING.familyPro.annual : PRICING.familyPro.monthly}
              </span>
              <span className="price-period">
                /{billingPeriod === "annual" ? "year" : "month"}
              </span>
            </div>
            {billingPeriod === "annual" && (
              <p className="price-savings">Save ${PRICING.familyPro.annualSavings}/year</p>
            )}
            <ul className="pricing-features">
              <li>Up to <strong>25 family members</strong></li>
              <li><strong>Unlimited</strong> photo storage</li>
              <li>Advanced scrapbook themes</li>
              <li>Print discounts</li>
            </ul>
            <button
              className="btn primary"
              onClick={() => handleUpgrade("family_pro")}
              disabled={busy === "family_pro"}
            >
              {busy === "family_pro" ? "Processing..." : "Upgrade Family"}
            </button>
            <p className="pricing-note">Applies to one family you choose</p>
          </div>
        </div>

        {/* Free Tier Info */}
        <section className="card free-tier">
          <div className="card-title">
            <h2>Free Tier</h2>
            <span className="card-hint">Always included</span>
          </div>
          <div className="free-features">
            <div className="feature-item">
              <span className="feature-icon">&#10003;</span>
              <span>Join up to 2 families</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">&#10003;</span>
              <span>5 members per family</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">&#10003;</span>
              <span>1 GB storage per family</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">&#10003;</span>
              <span>Unlimited scrapbook pages</span>
            </div>
          </div>
        </section>

        <footer className="footer-note">
          <span className="pin" />
          Questions? Contact us at support@kinshipvault.com
        </footer>
      </div>
    </div>
  );
}
