// src/app/api/guest-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkServerRateLimitAsync, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { FieldValue } from "firebase-admin/firestore";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(request);

    // Parse form data first to get familyId for rate limit key
    const formData = await request.formData();
    const familyId = formData.get("familyId") as string | null;
    const uploadSecret = formData.get("uploadSecret") as string | null;

    if (!familyId) {
      return NextResponse.json({ error: "No family ID provided" }, { status: 400 });
    }

    if (!uploadSecret) {
      return NextResponse.json({ error: "Invalid upload link" }, { status: 403 });
    }

    // Rate limit key: IP + familyId (prevents abuse across families)
    const rateLimitKey = `guest-upload:${familyId}`;

    // Check burst limit (5/minute) - prevents rapid-fire uploads
    // Uses distributed rate limiting via Upstash Redis
    const burstLimit = await checkServerRateLimitAsync(
      clientId,
      `${rateLimitKey}:burst`,
      RATE_LIMITS.guestUploadBurst.maxRequests,
      RATE_LIMITS.guestUploadBurst.windowMs
    );

    if (!burstLimit.allowed) {
      return rateLimitResponse(burstLimit.resetIn);
    }

    // Check sustained limit (20/hour) - prevents grinding
    const sustainedLimit = await checkServerRateLimitAsync(
      clientId,
      `${rateLimitKey}:sustained`,
      RATE_LIMITS.guestUploadSustained.maxRequests,
      RATE_LIMITS.guestUploadSustained.windowMs
    );

    if (!sustainedLimit.allowed) {
      return rateLimitResponse(sustainedLimit.resetIn);
    }

    // Continue with form data (already parsed above)
    const file = formData.get("file") as File | null;
    const guestName = (formData.get("guestName") as string | null)?.trim() || "Anonymous";

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    // Verify family exists and has guest uploads enabled
    const familyRef = adminDb.doc(`families/${familyId}`);
    const familySnap = await familyRef.get();

    if (!familySnap.exists) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }

    const familyData = familySnap.data();

    // Validate upload secret (prevents guessing familyIds)
    if (!familyData?.uploadSecret || familyData.uploadSecret !== uploadSecret) {
      return NextResponse.json(
        { error: "Invalid upload link" },
        { status: 403 }
      );
    }

    // Check if family has Event Pack subscription (only tier with guest uploads)
    const subscriptionType = familyData?.subscription?.type;
    const subscriptionStatus = familyData?.subscription?.status;

    if (subscriptionType !== "event_pack" || subscriptionStatus !== "active") {
      return NextResponse.json(
        { error: "Guest uploads are not enabled for this family" },
        { status: 403 }
      );
    }

    // Check edit window for Event Pack (Year 1 or Renewal period)
    const editWindowEnd = familyData?.subscription?.editWindowEnd;
    if (editWindowEnd) {
      const editWindowDate = editWindowEnd.toDate ? editWindowEnd.toDate() : new Date(editWindowEnd);
      if (new Date() > editWindowDate) {
        return NextResponse.json(
          { error: "The upload period for this event has ended" },
          { status: 403 }
        );
      }
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
        headers: sustainedLimit.headers, // Use sustained limit headers for user visibility
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
