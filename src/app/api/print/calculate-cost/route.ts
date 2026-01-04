// src/app/api/print/calculate-cost/route.ts
// API route to calculate print order cost from Lulu

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const FUNCTIONS_BASE_URL =
  process.env.FIREBASE_FUNCTIONS_URL ||
  `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let uid: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const {
      familyId,
      bookSize,
      coverType,
      pageCount,
      quantity,
      shippingAddress,
      shippingLevel,
    } = body;

    if (!familyId || !bookSize || !pageCount || !quantity || !shippingAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user is member of family
    const memId = `${uid}_${familyId}`;
    const memDoc = await adminDb.collection("memberships").doc(memId).get();
    if (!memDoc.exists) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Call the Lulu cost calculation Cloud Function
    const functionUrl = `${FUNCTIONS_BASE_URL}/calculateLuluCost`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        bookSize,
        coverType: coverType || "soft",
        pageCount,
        quantity,
        shippingAddress,
        shippingLevel: shippingLevel || "MAIL",
      }),
    });

    if (!response.ok) {
      // Fall back to estimate
      const basePrices: Record<string, Record<string, number>> = {
        "8x8": { soft: 12.5, hard: 22.5 },
        "10x10": { soft: 16.5, hard: 28.5 },
        "8.5x11": { soft: 14.5, hard: 25.5 },
      };
      const basePrice = basePrices[bookSize]?.[coverType] || 15;

      const printingCost = (basePrice + pageCount * 0.12) * quantity;
      const shippingCost = shippingLevel === "EXPEDITED" ? 24.99 : shippingLevel === "PRIORITY" ? 14.99 : shippingLevel === "GROUND" ? 8.99 : 5.99;

      return NextResponse.json({
        currency: "USD",
        printingCost,
        shippingCost,
        totalCostExclTax: printingCost + shippingCost,
        totalCostInclTax: printingCost + shippingCost,
        tax: 0,
        isEstimate: true,
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Calculate cost error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
