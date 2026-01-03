// src/app/api/guest-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkServerRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { FieldValue } from "firebase-admin/firestore";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(request);

    // Check rate limit
    const rateLimit = checkServerRateLimit(
      clientId,
      "guest-upload",
      RATE_LIMITS.guestUpload.maxRequests,
      RATE_LIMITS.guestUpload.windowMs
    );

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const familyId = formData.get("familyId") as string | null;
    const guestName = (formData.get("guestName") as string | null)?.trim() || "Anonymous";

    // Validate inputs
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
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Verify family exists
    const familyRef = adminDb.doc(`families/${familyId}`);
    const familySnap = await familyRef.get();

    if (!familySnap.exists) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
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

    // Create pending upload document in Firestore
    const pendingRef = adminDb.collection(`families/${familyId}/pendingUploads`).doc();
    await pendingRef.set({
      id: pendingRef.id,
      imageId: uploadData.imageId,
      imageUrl: uploadData.deliveryURL,
      guestName: guestName.substring(0, 50), // Limit name length
      clientIp: clientId,
      sizeBytes: file.size,
      mimeType: file.type,
      status: "pending", // pending, approved, rejected
      createdAt: FieldValue.serverTimestamp(),
    });

    // Increment pending count on family (optional - for badges)
    await familyRef.update({
      pendingUploadCount: FieldValue.increment(1),
    }).catch(() => {
      // Ignore if field doesn't exist yet
    });

    return NextResponse.json(
      {
        success: true,
        id: pendingRef.id,
        message: "Photo uploaded successfully. It will be reviewed by the family.",
      },
      {
        status: 200,
        headers: rateLimit.headers,
      }
    );
  } catch (error) {
    console.error("Guest upload error:", error);
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
