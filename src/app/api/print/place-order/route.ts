// src/app/api/print/place-order/route.ts
// API route to place a print order with Lulu

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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
    let userEmail: string | undefined;

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      uid = decodedToken.uid;
      userEmail = decodedToken.email;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const {
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
      // Cover customization
      familyName,
      bookTitle,
      primaryColor,
      secondaryColor,
      // Cover mode: "solid", "front-image", or "wraparound"
      coverMode,
      frontCoverImageUrl,
      wraparoundImageUrl,
    } = body;

    // Validate required fields
    if (!familyId || !compilationJobId || !r2Key || !shippingAddress) {
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

    // Verify compilation job exists and is complete
    const jobRef = adminDb
      .collection("families")
      .doc(familyId)
      .collection("compilationJobs")
      .doc(compilationJobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return NextResponse.json(
        { error: "Compilation job not found" },
        { status: 404 }
      );
    }

    const jobData = jobDoc.data();
    if (jobData?.status !== "complete") {
      return NextResponse.json(
        { error: "Book compilation is not complete" },
        { status: 400 }
      );
    }

    // Create print order in Firestore (pending state)
    const orderRef = await adminDb
      .collection("families")
      .doc(familyId)
      .collection("printOrders")
      .add({
        familyId,
        compilationJobId,
        r2Key,
        bookSize,
        coverType: coverType || "soft",
        pageCount,
        quantity,
        shippingAddress,
        shippingLevel: shippingLevel || "MAIL",
        contactEmail: contactEmail || userEmail,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: uid,
        // Cover design
        coverDesign: {
          coverMode: coverMode || "solid",
          familyName,
          bookTitle,
          primaryColor,
          secondaryColor,
          frontCoverImageUrl,
          wraparoundImageUrl,
        },
      });

    // Call Lulu print job Cloud Function
    try {
      const functionUrl = `${FUNCTIONS_BASE_URL}/createLuluPrintJob`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          familyId,
          orderId: orderRef.id,
          compilationJobId,
          r2Key,
          bookSize,
          coverType: coverType || "soft",
          pageCount,
          quantity,
          shippingAddress,
          shippingLevel: shippingLevel || "MAIL",
          contactEmail: contactEmail || userEmail,
          // Cover customization
          familyName,
          bookTitle,
          primaryColor,
          secondaryColor,
          // Cover mode options
          coverMode,
          frontCoverImageUrl,
          wraparoundImageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Lulu API error");
      }

      const luluData = await response.json();

      // Update order with Lulu info
      await orderRef.update({
        status: "submitted",
        luluPrintJobId: luluData.result?.printJobId || luluData.printJobId,
        luluStatus: luluData.result?.status || luluData.status,
        coverR2Key: luluData.result?.coverR2Key,
        submittedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        orderId: orderRef.id,
        luluPrintJobId: luluData.result?.printJobId || luluData.printJobId,
        status: "submitted",
      });
    } catch (luluError) {
      // Update order to failed state
      await orderRef.update({
        status: "failed",
        error: luluError instanceof Error ? luluError.message : "Unknown error",
        failedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        {
          orderId: orderRef.id,
          error: luluError instanceof Error ? luluError.message : "Failed to submit to Lulu",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Place order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
