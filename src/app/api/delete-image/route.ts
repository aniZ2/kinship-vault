// src/app/api/delete-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

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
    const { imageId, familyId } = body;

    if (!imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }

    if (!familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

    // Verify user has permission (must be owner or admin of family)
    const memberRef = adminDb.doc(`families/${familyId}/members/${uid}`);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }

    const memberData = memberSnap.data();
    const role = memberData?.role;

    if (role !== "owner" && role !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can delete images" },
        { status: 403 }
      );
    }

    // Delete from R2 via images API
    const imagesApiBase = process.env.NEXT_PUBLIC_IMAGES_API_BASE?.replace(/\/+$/, "");
    if (!imagesApiBase) {
      console.error("Missing NEXT_PUBLIC_IMAGES_API_BASE");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const deleteRes = await fetch(`${imagesApiBase}/images/${encodeURIComponent(imageId)}`, {
      method: "DELETE",
    });

    // 404 is ok - image may have already been deleted
    if (!deleteRes.ok && deleteRes.status !== 404) {
      console.error("Image delete failed:", deleteRes.status);
      return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Reject other methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
