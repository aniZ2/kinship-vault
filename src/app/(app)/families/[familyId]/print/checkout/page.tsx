// src/app/(app)/families/[familyId]/print/checkout/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { formatMoney } from "@/lib/utils";
import { PageCardPreview } from "@/components/FamilyStory/PageCardPreview";

const PRICING = { currency: "USD", baseBySize: { "8x8": 24, "10x10": 32, "8.5x11": 29 } as Record<string, number>, perExtraPage: 0.75, hardcoverUpcharge: 8, premiumPaperUpcharge: 6, shippingFlat: 6.95, taxRate: 0, includedPages: 20 };

interface PageData { id: string; title?: string; previewURL?: string; [key: string]: unknown; }

export default function YearbookCheckoutPage() {
  const params = useParams();
  const familyId = params.familyId as string;
  const searchParams = useSearchParams();
  const ids = useMemo(() => (searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean), [searchParams]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const [size, setSize] = useState("8x8");
  const [cover, setCover] = useState("soft");
  const [paper, setPaper] = useState("standard");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!familyId || ids.length === 0 || !db) { setPages([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const list: PageData[] = [];
      for (const id of ids) { const snap = await getDoc(doc(db, `families/${familyId}/pages/${id}`)); if (snap.exists()) list.push({ id: snap.id, ...snap.data() } as PageData); }
      setPages(list); setLoading(false);
    })();
  }, [familyId, ids]);

  const pageCount = pages.length;
  const estimate = useMemo(() => {
    const base = PRICING.baseBySize[size] ?? 0;
    const extra = Math.max(0, pageCount - PRICING.includedPages) * PRICING.perExtraPage;
    const coverFee = cover === "hard" ? PRICING.hardcoverUpcharge : 0;
    const paperFee = paper === "premium" ? PRICING.premiumPaperUpcharge : 0;
    const unit = base + extra + coverFee + paperFee;
    const subtotal = unit * qty;
    const shipping = PRICING.shippingFlat * (qty > 0 ? 1 : 0);
    const tax = subtotal * PRICING.taxRate;
    return { currency: PRICING.currency, unit, subtotal, shipping, tax, total: subtotal + shipping + tax };
  }, [size, cover, paper, qty, pageCount]);

  async function saveQuote(status = "quote") {
    if (!familyId || pages.length === 0 || !db || !auth) return;
    setSaving(true);
    try {
      const order = { familyId, pageIds: pages.map((p) => p.id), pageCount, size, cover, paper, qty, note: note?.slice(0, 600) || "", currency: estimate.currency, unitPrice: +estimate.unit.toFixed(2), subtotal: +estimate.subtotal.toFixed(2), shipping: +estimate.shipping.toFixed(2), tax: +estimate.tax.toFixed(2), total: +estimate.total.toFixed(2), status, createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid || "anon" };
      const ref = await addDoc(collection(db, `families/${familyId}/printOrders`), order);
      router.replace(status === "pending-payment" ? `/families/${familyId}/print/orders/${ref.id}/pay` : `/families/${familyId}/print/orders/${ref.id}`);
    } catch { alert("Could not save order."); } finally { setSaving(false); }
  }

  if (!isClient || !db) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <style>{`.checkout-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 18px; } @media (max-width: 960px) { .checkout-grid { grid-template-columns: 1fr; } } .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; } .h2 { margin: 0 0 10px; font-size: 18px; font-weight: 800; } .opts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .opts label { display: grid; gap: 6px; font-weight: 600; } .opts select, .opts input, .opts textarea { border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; } .pages { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 12px; } .thumb { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; } .summary { display: grid; gap: 8px; } .row { display: flex; justify-content: space-between; } .total { font-weight: 800; font-size: 18px; } .btns { display: flex; gap: 10px; margin-top: 10px; }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><div><strong>Yearbook – Print Order</strong> <span style={{ color: "#64748b", fontSize: 12 }}>{loading ? "Loading…" : `${pageCount} pages selected`}</span></div><Link href={`/families/${familyId}/story`} className="btn ghost">Back to Story</Link></div>
      <div className="checkout-grid">
        <div className="panel"><h2 className="h2">Your pages</h2>{loading ? <div>Loading…</div> : pageCount === 0 ? <div>No pages selected.</div> : <div className="pages">{pages.map((p) => <div key={p.id} className="thumb"><PageCardPreview familyId={familyId} page={p} /></div>)}</div>}</div>
        <div className="panel">
          <h2 className="h2">Options & Summary</h2>
          <div className="opts" style={{ marginBottom: 12 }}>
            <label>Size<select value={size} onChange={(e) => setSize(e.target.value)}><option value="8x8">8×8 in</option><option value="10x10">10×10 in</option><option value="8.5x11">8.5×11 in</option></select></label>
            <label>Cover<select value={cover} onChange={(e) => setCover(e.target.value)}><option value="soft">Softcover</option><option value="hard">Hardcover (+{formatMoney(PRICING.hardcoverUpcharge)})</option></select></label>
            <label>Paper<select value={paper} onChange={(e) => setPaper(e.target.value)}><option value="standard">Standard</option><option value="premium">Premium (+{formatMoney(PRICING.premiumPaperUpcharge)})</option></select></label>
            <label>Quantity<input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} /></label>
            <label style={{ gridColumn: "1 / -1" }}>Note (optional)<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          </div>
          <div className="summary">
            <div className="row"><span>Unit (est.)</span><span>{formatMoney(estimate.unit)}</span></div>
            <div className="row"><span>Subtotal</span><span>{formatMoney(estimate.subtotal)}</span></div>
            <div className="row"><span>Shipping</span><span>{formatMoney(estimate.shipping)}</span></div>
            <div className="row total"><span>Total</span><span>{formatMoney(estimate.total)}</span></div>
            <div className="btns"><button className="btn ghost" disabled={saving || pageCount === 0} onClick={() => saveQuote("quote")}>{saving ? "Saving…" : "Save Quote"}</button><button className="btn primary" disabled={saving || pageCount === 0} onClick={() => saveQuote("pending-payment")}>{saving ? "Working…" : "Place Order"}</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
