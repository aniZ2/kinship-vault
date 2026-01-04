/**
 * Lulu Print-on-Demand API Integration
 *
 * Lulu 2026 Specifications:
 * - Interior: Full color, 0.125" bleed
 * - Cover: Separate PDF (not handled here - future enhancement)
 * - Shipping: MAIL, PRIORITY, GROUND, EXPEDITED options
 *
 * API Reference: https://developers.lulu.com/
 */

const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getPresignedUrlForLulu } = require("../r2Client");

// Lulu API base URL
const LULU_API_BASE = "https://api.lulu.com";

/**
 * Lulu POD Package IDs
 *
 * Format: {width}X{height}{colorspec}{bindingspec}{pagecount}{paper}
 *
 * Color specs:
 * - BW = Black & White
 * - FC = Full Color (Standard)
 * - PR = Premium Color
 *
 * Binding:
 * - STDPB = Standard Paperback (softcover)
 * - STDHC = Standard Hardcover
 *
 * Paper:
 * - 080 = 80# paper
 * - UW444 = Uncoated White, 4/4 (full color both sides)
 */
const LULU_POD_PACKAGES = {
  "8x8": {
    soft: "0850X0850FCSTDPB080UW444",
    hard: "0850X0850FCSTDHC080CW444",
  },
  "10x10": {
    soft: "1000X1000FCSTDPB080UW444",
    hard: "1000X1000FCSTDHC080CW444",
  },
  "8.5x11": {
    soft: "0850X1100FCSTDPB080UW444",
    hard: "0850X1100FCSTDHC080CW444",
  },
};

/**
 * Shipping level options
 */
const SHIPPING_LEVELS = {
  MAIL: "MAIL", // Standard mail (cheapest, 7-21 days)
  GROUND: "GROUND", // Ground shipping (5-10 days)
  PRIORITY: "PRIORITY", // Priority (3-7 days)
  EXPEDITED: "EXPEDITED", // Expedited (2-4 days)
};

/**
 * Get a Lulu API access token
 *
 * @returns {Promise<string>} Access token
 */
async function getLuluAccessToken() {
  const clientId = process.env.LULU_CLIENT_ID;
  const clientSecret = process.env.LULU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Lulu API credentials not configured");
  }

  const response = await fetch(`${LULU_API_BASE}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lulu auth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Calculate shipping cost for an order
 *
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Cost breakdown
 */
async function calculateShippingCost(orderData) {
  const { bookSize, coverType, quantity, shippingAddress, shippingLevel } = orderData;

  const accessToken = await getLuluAccessToken();
  const podPackage = LULU_POD_PACKAGES[bookSize]?.[coverType];

  if (!podPackage) {
    throw new Error(`Invalid book configuration: ${bookSize} ${coverType}`);
  }

  const response = await fetch(`${LULU_API_BASE}/print-job-cost-calculations/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      line_items: [
        {
          page_count: orderData.pageCount,
          pod_package_id: podPackage,
          quantity,
        },
      ],
      shipping_address: {
        city: shippingAddress.city,
        country_code: shippingAddress.country,
        postcode: shippingAddress.postalCode,
        state_code: shippingAddress.state,
        street1: shippingAddress.street1,
      },
      shipping_level: shippingLevel || SHIPPING_LEVELS.MAIL,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Lulu cost calculation failed: ${JSON.stringify(error)}`);
  }

  const data = await response.json();

  return {
    currency: data.currency || "USD",
    totalCostExclTax: data.total_cost_excl_tax,
    totalCostInclTax: data.total_cost_incl_tax,
    shippingCost: data.shipping_cost?.total_cost_excl_tax,
    printingCost: data.line_item_costs?.[0]?.total_cost_excl_tax,
    tax: data.total_tax,
  };
}

/**
 * Create a print job with Lulu
 *
 * @param {Object} orderData - Order details
 * @param {string} orderData.familyId - Family ID
 * @param {string} orderData.jobId - Compilation job ID
 * @param {string} orderData.interiorR2Key - R2 key for interior PDF
 * @param {string} orderData.coverR2Key - R2 key for cover PDF (spread with back/spine/front)
 * @param {string} orderData.bookSize - Book size
 * @param {string} orderData.coverType - soft or hard
 * @param {number} orderData.quantity - Number of copies
 * @param {Object} orderData.shippingAddress - Shipping address
 * @param {string} orderData.shippingLevel - Shipping speed
 * @param {string} orderData.contactEmail - Contact email
 * @param {number} orderData.pageCount - Interior page count
 * @returns {Promise<Object>} Lulu print job response
 */
async function createPrintJob(orderData) {
  const {
    familyId,
    jobId,
    interiorR2Key,
    coverR2Key,
    // Legacy support: r2Key used for interior if interiorR2Key not provided
    r2Key,
    bookSize,
    coverType,
    quantity,
    shippingAddress,
    shippingLevel,
    contactEmail,
    externalId,
    pageCount,
  } = orderData;

  const accessToken = await getLuluAccessToken();
  const podPackage = LULU_POD_PACKAGES[bookSize]?.[coverType];

  if (!podPackage) {
    throw new Error(`Invalid book configuration: ${bookSize} ${coverType}`);
  }

  // Get 24-hour presigned URLs for Lulu to fetch the PDFs
  const interiorKey = interiorR2Key || r2Key;
  if (!interiorKey) {
    throw new Error("Interior PDF R2 key is required");
  }

  const interiorDownloadInfo = await getPresignedUrlForLulu(interiorKey);

  // Cover URL - if coverR2Key provided, use it; otherwise Lulu will auto-generate
  let coverUrl;
  if (coverR2Key) {
    const coverDownloadInfo = await getPresignedUrlForLulu(coverR2Key);
    coverUrl = coverDownloadInfo.url;
  } else {
    // Fallback: use interior as cover (not ideal but prevents failures)
    console.warn("No cover R2 key provided, using interior PDF as cover fallback");
    coverUrl = interiorDownloadInfo.url;
  }

  const payload = {
    contact_email: contactEmail,
    external_id: externalId || `kv-${familyId}-${jobId}`,
    line_items: [
      {
        page_count: pageCount,
        pod_package_id: podPackage,
        quantity,
        printable_normalization: {
          cover: {
            source_url: coverUrl,
          },
          interior: {
            source_url: interiorDownloadInfo.url,
          },
        },
      },
    ],
    production_delay: 120, // 2 hour delay for cancellation window
    shipping_address: {
      city: shippingAddress.city,
      country_code: shippingAddress.country,
      name: shippingAddress.name,
      phone_number: shippingAddress.phone || "",
      postcode: shippingAddress.postalCode,
      state_code: shippingAddress.state,
      street1: shippingAddress.street1,
      street2: shippingAddress.street2 || "",
    },
    shipping_level: shippingLevel || SHIPPING_LEVELS.MAIL,
  };

  const response = await fetch(`${LULU_API_BASE}/print-jobs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Lulu print job creation failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Get the status of a print job
 *
 * @param {string} printJobId - Lulu print job ID
 * @returns {Promise<Object>} Job status
 */
async function getPrintJobStatus(printJobId) {
  const accessToken = await getLuluAccessToken();

  const response = await fetch(`${LULU_API_BASE}/print-jobs/${printJobId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Lulu status check failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Cancel a print job (within cancellation window)
 *
 * @param {string} printJobId - Lulu print job ID
 * @returns {Promise<Object>} Cancellation result
 */
async function cancelPrintJob(printJobId) {
  const accessToken = await getLuluAccessToken();

  const response = await fetch(`${LULU_API_BASE}/print-jobs/${printJobId}/`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Lulu cancellation failed: ${JSON.stringify(error)}`);
  }

  return { cancelled: true, printJobId };
}

/**
 * Store a print order in Firestore
 *
 * @param {Object} orderData - Order details
 * @param {Object} luluResponse - Lulu API response
 * @returns {Promise<Object>} Created order document
 */
async function storePrintOrder(orderData, luluResponse) {
  const db = getFirestore();
  const { familyId, jobId } = orderData;

  const orderDoc = {
    familyId,
    compilationJobId: jobId,
    luluPrintJobId: luluResponse.id,
    luluStatus: luluResponse.status?.name || "CREATED",

    // Order details
    bookSize: orderData.bookSize,
    coverType: orderData.coverType,
    quantity: orderData.quantity,
    pageCount: orderData.pageCount,

    // Shipping
    shippingAddress: orderData.shippingAddress,
    shippingLevel: orderData.shippingLevel,

    // Pricing
    estimatedCost: luluResponse.estimated_shipping_dates
      ? luluResponse.costs
      : null,

    // Tracking
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: orderData.createdBy,

    // Status history
    statusHistory: [
      {
        status: "created",
        timestamp: new Date().toISOString(),
        luluStatus: luluResponse.status?.name,
      },
    ],
  };

  const ref = await db
    .collection("families")
    .doc(familyId)
    .collection("printOrders")
    .add(orderDoc);

  return { id: ref.id, ...orderDoc };
}

/**
 * Update print order status from Lulu webhook
 *
 * @param {string} luluPrintJobId - Lulu print job ID
 * @param {Object} statusUpdate - New status data
 * @returns {Promise<void>}
 */
async function updateOrderFromWebhook(luluPrintJobId, statusUpdate) {
  const db = getFirestore();

  // Find the order by Lulu print job ID
  const snapshot = await db
    .collectionGroup("printOrders")
    .where("luluPrintJobId", "==", luluPrintJobId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.warn(`No order found for Lulu print job: ${luluPrintJobId}`);
    return;
  }

  const orderDoc = snapshot.docs[0];

  await orderDoc.ref.update({
    luluStatus: statusUpdate.status?.name || statusUpdate.status,
    trackingNumber: statusUpdate.shipping_info?.tracking_id || null,
    trackingUrl: statusUpdate.shipping_info?.tracking_url || null,
    updatedAt: FieldValue.serverTimestamp(),
    statusHistory: FieldValue.arrayUnion({
      status: statusUpdate.status?.name || statusUpdate.status,
      timestamp: new Date().toISOString(),
      trackingNumber: statusUpdate.shipping_info?.tracking_id,
    }),
  });
}

module.exports = {
  LULU_API_BASE,
  LULU_POD_PACKAGES,
  SHIPPING_LEVELS,
  getLuluAccessToken,
  calculateShippingCost,
  createPrintJob,
  getPrintJobStatus,
  cancelPrintJob,
  storePrintOrder,
  updateOrderFromWebhook,
};
