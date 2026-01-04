// src/app/api/book/refresh-download/route.ts
// API route to refresh a compilation job's download URL

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

// Cloud Functions base URL
const FUNCTIONS_BASE_URL =
  process.env.FIREBASE_FUNCTIONS_URL ||
  `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export async function POST(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the token
    let uid: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const { familyId, jobId } = body;

    if (!familyId || !jobId) {
      return NextResponse.json(
        { error: "Missing familyId or jobId" },
        { status: 400 }
      );
    }

    // Verify user is a member of the family
    const memId = `${uid}_${familyId}`;
    const memDoc = await adminDb.collection("memberships").doc(memId).get();

    if (!memDoc.exists) {
      return NextResponse.json(
        { error: "You don't have access to this family" },
        { status: 403 }
      );
    }

    // Call the Cloud Function
    const functionUrl = `${FUNCTIONS_BASE_URL}/refreshBookDownload`;

    console.log(`Calling refresh download function: ${functionUrl}`);

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ familyId, jobId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Refresh download error:", response.status, errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to refresh download URL" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Refresh download API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
