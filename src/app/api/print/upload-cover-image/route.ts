// src/app/api/print/upload-cover-image/route.ts
// API route to upload a custom cover image for print orders

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const familyId = formData.get("familyId") as string | null;
    const coverPosition = formData.get("position") as string | null; // "front" or "back"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!familyId) {
      return NextResponse.json({ error: "No family ID provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPG, PNG, or WebP image." },
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

    // Upload to images API
    const imagesApiBase = process.env.NEXT_PUBLIC_IMAGES_API_BASE?.replace(/\/+$/, "");
    if (!imagesApiBase) {
      console.error("Missing NEXT_PUBLIC_IMAGES_API_BASE");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    const uploadRes = await fetch(`${imagesApiBase}/upload`, {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => "");
      console.error("Image upload failed:", uploadRes.status, errText);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    if (!uploadData?.imageId || !uploadData?.deliveryURL) {
      return NextResponse.json({ error: "Invalid upload response" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageId: uploadData.imageId,
      imageUrl: uploadData.deliveryURL,
      position: coverPosition || "front",
    });
  } catch (error) {
    console.error("Cover image upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
