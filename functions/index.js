// Firebase Functions v2 — Firestore triggers + Membership & Roles
// Using cors middleware for proper CORS handling

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  onDocumentCreated,
  onDocumentWritten,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const cors = require("cors");
const { sendEmail } = require("./emails/resend");
const {
  generateEventOnboardingEmail,
  generateEventOnboardingText,
} = require("./emails/templates/eventOnboarding");

try { admin.app(); } catch { admin.initializeApp(); }

const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// CORS middleware - allow all origins for now
const corsHandler = cors({ origin: true, credentials: true });

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────
function sendSuccess(res, data) {
  res.status(200).json({ result: data });
}

function sendError(res, code, message) {
  const statusMap = {
    "unauthenticated": 401,
    "permission-denied": 403,
    "not-found": 404,
    "invalid-argument": 400,
    "failed-precondition": 400,
  };
  res.status(statusMap[code] || 500).json({ error: { code, message } });
}

async function verifyAuth(req) {
  const authHeader = req.get("Authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return null;
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch {
    return null;
  }
}

function memId(uid, familyId) { return `${uid}_${familyId}`; }

function roleOf(m) {
  return m?.role === "owner" ? "owner" : (m?.role === "admin" ? "admin" : "member");
}

function deltaForRoleChange(oldRole, newRole) {
  const d = { owner: 0, admin: 0 };
  if (oldRole === "owner") d.owner -= 1;
  if (oldRole === "admin") d.admin -= 1;
  if (newRole === "owner") d.owner += 1;
  if (newRole === "admin") d.admin += 1;
  return d;
}

async function getUsageAndLimit(uid) {
  const db = getFirestore();
  let limit = 2;
  try {
    const u = await db.collection("users").doc(uid).get();
    const d = u.data();
    if (d && Number.isFinite(d.membershipLimit)) limit = d.membershipLimit;
  } catch {}
  try {
    const agg = await db.collection("memberships").where("uid", "==", uid).count().get();
    return { current: agg.data().count || 0, limit };
  } catch {
    const snap = await db.collection("memberships").where("uid", "==", uid).get();
    return { current: snap.size, limit };
  }
}

let geohashEncode;
try { geohashEncode = require("ngeohash").encode; } catch {}

// ───────────────────────────────────────────────────────────────────────────────
// Firestore Triggers
// ───────────────────────────────────────────────────────────────────────────────

exports.fsOnQuestionCreate = onDocumentCreated(
  "families/{fid}/questions/{qid}",
  async (event) => {
    const db = getFirestore();
    const { fid } = event.params;
    const fam = (await db.doc(`families/${fid}`).get()).data();
    const elders = fam?.elders?.length ? fam.elders : fam?.owners || [];

    const batch = db.batch();
    elders.forEach(uid => {
      const ref = db.doc(`users/${uid}/inbox/${db.collection("_").doc().id}`);
      batch.set(ref, {
        type: "question_assigned",
        familyId: fid,
        questionId: event.params.qid,
        createdAt: FieldValue.serverTimestamp(),
        read: false
      });
    });
    await batch.commit();
  }
);

exports.fsOnResponseCreate = onDocumentCreated(
  "families/{fid}/questions/{qid}/responses/{rid}",
  async (event) => {
    const db = getFirestore();
    const { fid, qid } = event.params;
    const qRef = db.doc(`families/${fid}/questions/${qid}`);
    const qSnap = await qRef.get();
    if (!qSnap.exists) return;

    await qRef.update({ status: "answered", updatedAt: FieldValue.serverTimestamp() });

    const askedBy = qSnap.data().askedBy;
    if (askedBy) {
      const inboxRef = db.doc(`users/${askedBy}/inbox/${db.collection("_").doc().id}`);
      await inboxRef.set({
        type: "response_posted",
        familyId: fid,
        questionId: qid,
        createdAt: FieldValue.serverTimestamp(),
        read: false
      });
    }
  }
);

exports.fsOnPageCreate = onDocumentCreated(
  "families/{fid}/pages/{pid}",
  async (event) => {
    const db = getFirestore();
    const { fid, pid } = event.params;
    const thePage = event.data.data();
    const updates = { updatedAt: FieldValue.serverTimestamp() };

    if (thePage?.location && !thePage?.geohash && geohashEncode) {
      const h = geohashEncode(thePage.location._latitude, thePage.location._longitude, 9);
      updates.geohash = h;
    }
    if (thePage?.order == null) {
      updates.order = Math.floor(Date.now() / 1000);
    }

    await Promise.allSettled([
      db.doc(`families/${fid}`).update({ updatedAt: FieldValue.serverTimestamp() }),
      db.doc(`families/${fid}/pages/${pid}`).update(updates)
    ]);
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// Membership Counter Trigger
// ───────────────────────────────────────────────────────────────────────────────

exports.membershipCounter = onDocumentWritten(
  {
    document: "memberships/{memId}",
    region: "us-central1",
    cpu: 0.08,
    memory: "128MiB",
    concurrency: 1,
    minInstances: 0,
    maxInstances: 5,
  },
  async (event) => {
    const db = getFirestore();
    const before = event?.data?.before?.data() || null;
    const after  = event?.data?.after?.data()  || null;

    if (before && !after) {
      const famId = before.familyId;
      if (!famId) return;
      const role = roleOf(before);
      await db.doc(`families/${famId}`).set({
        memberCount: FieldValue.increment(-1),
        ownerCount:  FieldValue.increment(role === "owner" ? -1 : 0),
        adminCount:  FieldValue.increment(role === "admin" ? -1 : 0),
        updatedAt:   FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    if (!before && after) {
      const famId = after.familyId;
      if (!famId) return;
      const role = roleOf(after);
      await db.doc(`families/${famId}`).set({
        memberCount: FieldValue.increment(1),
        ownerCount:  FieldValue.increment(role === "owner" ? 1 : 0),
        adminCount:  FieldValue.increment(role === "admin" ? 1 : 0),
        updatedAt:   FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }

    if (before && after) {
      if (before.familyId !== after.familyId) {
        const oldRole = roleOf(before);
        const newRole = roleOf(after);
        const dec = {
          ownerCount: FieldValue.increment(oldRole === "owner" ? -1 : 0),
          adminCount: FieldValue.increment(oldRole === "admin" ? -1 : 0),
          memberCount: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        };
        const inc = {
          ownerCount: FieldValue.increment(newRole === "owner" ? 1 : 0),
          adminCount: FieldValue.increment(newRole === "admin" ? 1 : 0),
          memberCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        };
        await Promise.all([
          db.doc(`families/${before.familyId}`).set(dec, { merge: true }),
          db.doc(`families/${after.familyId}`).set(inc, { merge: true }),
        ]);
        return;
      }

      const oldRole = roleOf(before);
      const newRole = roleOf(after);
      if (oldRole === newRole) return;

      const delta = deltaForRoleChange(oldRole, newRole);
      await db.doc(`families/${after.familyId}`).set({
        ownerCount: FieldValue.increment(delta.owner),
        adminCount: FieldValue.increment(delta.admin),
        updatedAt:  FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// HTTP Functions (with CORS middleware)
// ───────────────────────────────────────────────────────────────────────────────

exports.getMembershipUsage = onRequest({ region: "us-central1" }, (req, res) => {
  corsHandler(req, res, async () => {
    const auth = await verifyAuth(req);
    if (!auth?.uid) return sendError(res, "unauthenticated", "Sign in required");
    
    const usage = await getUsageAndLimit(auth.uid);
    sendSuccess(res, usage);
  });
});

exports.createFamily = onRequest({ region: "us-central1" }, (req, res) => {
  corsHandler(req, res, async () => {
    const auth = await verifyAuth(req);
    if (!auth?.uid) return sendError(res, "unauthenticated", "Sign in required");

    const body = req.body?.data || req.body || {};
    const name = (body.name || "").toString().trim();
    if (!name) return sendError(res, "invalid-argument", "Missing name");

    const { current, limit } = await getUsageAndLimit(auth.uid);
    if (current >= limit) return sendError(res, "failed-precondition", "Membership limit reached");

    const db = getFirestore();
    const now = FieldValue.serverTimestamp();

    const famRef = db.collection("families").doc();
    await famRef.set({
      name,
      ownerUid: auth.uid,
      memberLimit: 5,
      memberCount: 0,
      ownerCount: 0,
      adminCount: 0,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    const memRef = db.collection("memberships").doc(memId(auth.uid, famRef.id));
    await memRef.set({
      uid: auth.uid,
      familyId: famRef.id,
      role: "owner",
      familyName: name,
      familyCreatedAt: now,
    }, { merge: true });

    sendSuccess(res, { id: famRef.id, name, createdAt: null });
  });
});

exports.getFamilyMeta = onRequest({ region: "us-central1" }, (req, res) => {
  corsHandler(req, res, async () => {
    const body = req.body?.data || req.body || {};
    const familyId = (body.familyId || "").toString().trim();
    if (!familyId) return sendError(res, "invalid-argument", "familyId required");
    
    const db = getFirestore();
    const snap = await db.doc(`families/${familyId}`).get();
    if (!snap.exists) return sendError(res, "not-found", "Family not found");
    
    const f = snap.data();
    sendSuccess(res, {
      id: familyId,
      name: f.name || "",
      memberCount: Number(f.memberCount) || 0,
      ownerCount: Number(f.ownerCount) || 0,
      adminCount: Number(f.adminCount) || 0,
      memberLimit: Number.isFinite(f.memberLimit) ? f.memberLimit : 5,
    });
  });
});

exports.joinFamily = onRequest({ region: "us-central1" }, (req, res) => {
  corsHandler(req, res, async () => {
    const auth = await verifyAuth(req);
    if (!auth?.uid) return sendError(res, "unauthenticated", "Sign in required");

    const body = req.body?.data || req.body || {};
    const familyId = (body.familyId || "").toString().trim();
    if (!familyId) return sendError(res, "invalid-argument", "familyId is required");

    const { current, limit } = await getUsageAndLimit(auth.uid);
    if (current >= limit) return sendError(res, "failed-precondition", "Membership limit reached");

    const db = getFirestore();
    const famRef = db.doc(`families/${familyId}`);
    const famSnap = await famRef.get();
    if (!famSnap.exists) return sendError(res, "not-found", "Family not found");
    const fam = famSnap.data();

    const memberLimit = Number.isFinite(fam.memberLimit) ? fam.memberLimit : 5;
    const memberCount = Number(fam.memberCount) || 0;
    if (memberCount >= memberLimit) {
      return sendError(res, "failed-precondition", "This family is at capacity.");
    }

    const mref = db.collection("memberships").doc(memId(auth.uid, familyId));
    const msnap = await mref.get();
    if (msnap.exists) {
      return sendSuccess(res, { alreadyMember: true, id: familyId, name: fam.name || null, createdAt: fam.createdAt || null });
    }

    const now = FieldValue.serverTimestamp();
    await mref.set({
      uid: auth.uid,
      familyId,
      role: "member",
      familyName: fam.name || "",
      familyCreatedAt: fam.createdAt || now,
    }, { merge: true });

    sendSuccess(res, { alreadyMember: false, id: familyId, name: fam.name || null, createdAt: fam.createdAt || null });
  });
});

exports.leaveFamily = onRequest({ region: "us-central1" }, (req, res) => {
  corsHandler(req, res, async () => {
    const auth = await verifyAuth(req);
    if (!auth?.uid) return sendError(res, "unauthenticated", "Sign in required");

    const body = req.body?.data || req.body || {};
    const familyId = (body.familyId || "").toString().trim();
    if (!familyId) return sendError(res, "invalid-argument", "familyId is required");

    const db = getFirestore();
    const famRef = db.doc(`families/${familyId}`);
    const famSnap = await famRef.get();
    if (!famSnap.exists) return sendError(res, "not-found", "Family not found");
    const fam = famSnap.data();

    const mref = db.doc(`memberships/${memId(auth.uid, familyId)}`);
    const msnap = await mref.get();
    if (!msnap.exists) return sendSuccess(res, { ok: true, id: familyId });
    const myRole = roleOf(msnap.data());

    const memberCount = Number(fam.memberCount) || 0;
    if (memberCount <= 1) {
      return sendError(res, "failed-precondition", "You are the only member. Delete the family instead.");
    }

    if (fam.ownerUid === auth.uid) {
      return sendError(res, "failed-precondition", "You are the creator. Transfer ownership to a member before leaving.");
    }

    const ownerCount = Number(fam.ownerCount) || 0;
    if (myRole === "owner" && ownerCount <= 1) {
      return sendError(res, "failed-precondition", "You are the last owner. Transfer ownership before leaving.");
    }

    await mref.delete();
    sendSuccess(res, { ok: true, id: familyId });
  });
});

exports.deleteFamily = onRequest({ region: "us-central1", timeoutSeconds: 120, memory: "512MiB" }, (req, res) => {
  corsHandler(req, res, async () => {
    const auth = await verifyAuth(req);
    if (!auth?.uid) return sendError(res, "unauthenticated", "Sign in required");

    const body = req.body?.data || req.body || {};
    const familyId = (body.familyId || "").trim();
    const confirmStr = (body.confirmName || "").trim();
    if (!familyId) return sendError(res, "invalid-argument", "familyId required");

    const db = getFirestore();
    const famRef = db.doc(`families/${familyId}`);
    const famSnap = await famRef.get();
    if (!famSnap.exists) return sendError(res, "not-found", "Family not found");
    const fam = famSnap.data();

    if (fam.ownerUid !== auth.uid) {
      return sendError(res, "permission-denied", "Only the owner can delete the family.");
    }

    const memberCount = Number(fam.memberCount) || 0;
    if (memberCount > 1) {
      return sendError(res, "failed-precondition", "Remove all other members first. Only the owner may remain to delete.");
    }

    const famName = fam.name || "";
    if (famName && confirmStr !== famName) {
      return sendError(res, "failed-precondition", "Confirmation text does not match the family name.");
    }

    const msSnap = await db.collection("memberships").where("familyId","==",familyId).get();
    const batch = db.batch();
    msSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    await famRef.set({ deletedAt: FieldValue.serverTimestamp() }, { merge: true });

    sendSuccess(res, { ok: true, mode: "soft" });
  });
});

exports.setAdminRoles = onRequest({ region: "us-central1" }, (req, res) => {
  corsHandler(req, res, async () => {
    const auth = await verifyAuth(req);
    if (!auth?.uid) return sendError(res, "unauthenticated", "Sign in required");

    const body = req.body?.data || req.body || {};
    const familyId = (body.familyId || "").toString().trim();
    const adminUids = Array.isArray(body.adminUids) ? body.adminUids : [];
    if (!familyId) return sendError(res, "invalid-argument", "familyId is required");
    if (adminUids.length > 2) return sendError(res, "invalid-argument", "Only up to 2 admins allowed.");

    const db = getFirestore();
    const famRef = db.doc(`families/${familyId}`);
    const famSnap = await famRef.get();
    if (!famSnap.exists) return sendError(res, "not-found", "Family not found");
    const fam = famSnap.data();

    if (fam.ownerUid !== auth.uid) {
      return sendError(res, "permission-denied", "Only the owner can set admins.");
    }

    const updates = [];

    const existingAdmins = await db.collection("memberships")
      .where("familyId", "==", familyId)
      .where("role", "==", "admin")
      .get();

    existingAdmins.forEach((d) => {
      if (!adminUids.includes(d.data().uid)) {
        updates.push(d.ref.set({ role: "member", updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
      }
    });

    for (const targetUid of adminUids) {
      if (targetUid === fam.ownerUid) continue;
      const mref = db.doc(`memberships/${memId(targetUid, familyId)}`);
      const msnap = await mref.get();
      if (!msnap.exists) return sendError(res, "failed-precondition", `User ${targetUid} is not a member`);
      const role = roleOf(msnap.data());
      if (role !== "owner") {
        updates.push(mref.set({ role: "admin", updatedAt: FieldValue.serverTimestamp() }, { merge: true }));
      }
    }

    await Promise.all(updates);
    sendSuccess(res, { ok: true });
  });
});

exports.transferOwnership = onRequest({ region: "us-central1" }, (req, res) => {
  corsHandler(req, res, async () => {
    const auth = await verifyAuth(req);
    if (!auth?.uid) return sendError(res, "unauthenticated", "Sign in required");

    const body = req.body?.data || req.body || {};
    const familyId = (body.familyId || "").trim();
    const newOwnerUid = (body.newOwnerUid || "").trim();
    if (!familyId || !newOwnerUid) return sendError(res, "invalid-argument", "familyId and newOwnerUid required");
    if (auth.uid === newOwnerUid) return sendError(res, "invalid-argument", "Already owner");

    const db = getFirestore();
    const famRef = db.doc(`families/${familyId}`);
    const famSnap = await famRef.get();
    if (!famSnap.exists) return sendError(res, "not-found", "Family not found");
    const fam = famSnap.data();

    if (fam.ownerUid !== auth.uid) {
      return sendError(res, "permission-denied", "Only the current owner can transfer ownership.");
    }

    const targetMemRef = db.doc(`memberships/${memId(newOwnerUid, familyId)}`);
    const targetMem = await targetMemRef.get();
    if (!targetMem.exists) return sendError(res, "failed-precondition", "New owner must be a member.");

    const oldMemRef = db.doc(`memberships/${memId(auth.uid, familyId)}`);

    await db.runTransaction(async (tx) => {
      const me = await tx.get(oldMemRef);
      const t  = await tx.get(targetMemRef);
      if (!me.exists || roleOf(me.data()) !== "owner") {
        throw new Error("Ownership changed or you are no longer owner.");
      }
      if (!t.exists) throw new Error("New owner must be a member.");

      tx.set(targetMemRef, { role: "owner", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(oldMemRef, { role: "member", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.set(famRef, { ownerUid: newOwnerUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });

    sendSuccess(res, { ok: true, newOwnerUid });
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Event Pack Onboarding Email Trigger
// ───────────────────────────────────────────────────────────────────────────────

exports.onSubscriptionChange = onDocumentUpdated(
  {
    document: "families/{familyId}",
    region: "us-central1",
  },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const familyId = event.params.familyId;

    // Check if subscription just changed to event_pack with active status
    const beforeType = before.subscription?.type;
    const afterType = after.subscription?.type;
    const afterStatus = after.subscription?.status;

    // Only trigger on new event_pack subscriptions
    if (afterType !== "event_pack" || afterStatus !== "active") {
      return;
    }

    // Don't re-trigger if already was event_pack
    if (beforeType === "event_pack" && before.subscription?.status === "active") {
      return;
    }

    console.log(`Event Pack activated for family ${familyId}, sending onboarding emails`);

    const db = getFirestore();

    try {
      // Get all members of this family
      const membershipsSnap = await db
        .collection("memberships")
        .where("familyId", "==", familyId)
        .get();

      if (membershipsSnap.empty) {
        console.log("No members found for family", familyId);
        return;
      }

      // Collect member UIDs
      const memberUids = membershipsSnap.docs.map((d) => d.data().uid);

      // Fetch user details for each member
      const userPromises = memberUids.map((uid) =>
        db.doc(`users/${uid}`).get()
      );
      const userSnaps = await Promise.all(userPromises);

      // Build list of recipients with names and emails
      const recipients = userSnaps
        .filter((snap) => snap.exists)
        .map((snap) => {
          const data = snap.data();
          return {
            email: data.email,
            name: data.displayName || data.email?.split("@")[0] || "there",
          };
        })
        .filter((r) => r.email);

      if (recipients.length === 0) {
        console.log("No valid email addresses found for family", familyId);
        return;
      }

      console.log(`Sending onboarding emails to ${recipients.length} members`);

      // Send individual personalized emails
      const emailPromises = recipients.map((recipient) =>
        sendEmail({
          to: recipient.email,
          subject: "🗝️ Your Wedding Vault is Live! (Plus: Your Event Director's Guide)",
          html: generateEventOnboardingEmail({
            recipientName: recipient.name,
            familyName: after.name || "Your Event",
            familyId,
          }),
          text: generateEventOnboardingText({
            recipientName: recipient.name,
            familyName: after.name || "Your Event",
            familyId,
          }),
        })
      );

      const results = await Promise.allSettled(emailPromises);

      const successful = results.filter((r) => r.status === "fulfilled" && r.value?.success).length;
      const failed = results.filter((r) => r.status === "rejected" || !r.value?.success).length;

      console.log(`Onboarding emails sent: ${successful} success, ${failed} failed`);

      // Mark family as having received onboarding
      await db.doc(`families/${familyId}`).update({
        onboardingEmailSentAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("Error sending onboarding emails:", err);
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// PAGE LOCK ENFORCEMENT
// Handles automatic page locking after 7 days and session lock cleanup
// ───────────────────────────────────────────────────────────────────────────────

const { Timestamp } = require("firebase-admin/firestore");

/**
 * Scheduled function that runs every 15 minutes to:
 * 1. Auto-lock pages older than 7 days (sets isLocked: true)
 * 2. Clean up expired session locks
 */
exports.enforcePageLocks = onSchedule("every 15 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const fams = await db.collection("families").get();
  const writes = [];
  let batch = db.batch();
  let ops = 0;

  for (const fam of fams.docs) {
    const pagesRef = fam.ref.collection("pages");

    // 1) Auto-lock pages older than 7 days that aren't already locked
    const oldPagesNotLocked = await pagesRef
      .where("createdAt", "<=", sevenDaysAgo)
      .where("isLocked", "==", false)
      .get();

    oldPagesNotLocked.forEach((p) => {
      batch.update(p.ref, {
        isLocked: true,
        lockedAt: now,
        lockedByAdmin: "system",
      });
      if (++ops >= 450) {
        writes.push(batch);
        batch = db.batch();
        ops = 0;
      }
    });

    // Also check pages where isLocked field doesn't exist yet (legacy pages)
    const oldPagesNoField = await pagesRef
      .where("createdAt", "<=", sevenDaysAgo)
      .get();

    oldPagesNoField.forEach((p) => {
      const data = p.data();
      if (data.isLocked !== undefined) return;

      batch.update(p.ref, {
        isLocked: true,
        lockedAt: now,
        lockedByAdmin: "system",
      });
      if (++ops >= 450) {
        writes.push(batch);
        batch = db.batch();
        ops = 0;
      }
    });

    // 2) Clean up expired session locks
    const expiredLocks = await pagesRef
      .where("lockExpiresAt", "<=", now)
      .get();

    expiredLocks.forEach((p) => {
      const data = p.data();
      if (data.lockedBy) {
        batch.update(p.ref, {
          lockedBy: FieldValue.delete(),
          lockedByName: FieldValue.delete(),
          lockExpiresAt: FieldValue.delete(),
        });
        if (++ops >= 450) {
          writes.push(batch);
          batch = db.batch();
          ops = 0;
        }
      }
    });
  }

  writes.push(batch);
  await Promise.all(writes.map((b) => b.commit()));
  console.log(`enforcePageLocks completed: ${ops} operations in ${writes.length} batches`);
});

/**
 * Migration function to convert old `locked` field to `isLocked`
 * Runs monthly at 3 AM on the 1st to catch stragglers
 */
exports.migrateLockedField = onSchedule("0 3 1 * *", async () => {
  const db = getFirestore();
  const fams = await db.collection("families").get();
  let migrated = 0;

  for (const fam of fams.docs) {
    const oldLockedPages = await fam.ref
      .collection("pages")
      .where("locked", "==", true)
      .get();

    for (const page of oldLockedPages.docs) {
      const data = page.data();
      if (data.isLocked === undefined) {
        await page.ref.update({
          isLocked: true,
          lockedAt: FieldValue.serverTimestamp(),
          lockedByAdmin: "migration",
          locked: FieldValue.delete(),
          unlockExpiresAt: FieldValue.delete(),
          unlockUsed: FieldValue.delete(),
        });
        migrated++;
      }
    }

    const oldUnlockedPages = await fam.ref
      .collection("pages")
      .where("locked", "==", false)
      .get();

    for (const page of oldUnlockedPages.docs) {
      const data = page.data();
      if (data.isLocked === undefined) {
        await page.ref.update({
          isLocked: false,
          locked: FieldValue.delete(),
          unlockExpiresAt: FieldValue.delete(),
          unlockUsed: FieldValue.delete(),
        });
        migrated++;
      }
    }
  }

  console.log(`migrateLockedField completed: ${migrated} pages migrated`);
});

// ───────────────────────────────────────────────────────────────────────────────
// CLEANUP JOBS
// Handles expired view tokens and rejected uploads
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Scheduled function that runs daily at 3 AM to:
 * 1. Delete expired view tokens
 * 2. Delete rejected uploads older than 30 days
 * 3. Delete old Stripe event records
 */
exports.cleanupExpiredData = onSchedule("0 3 * * *", async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  let deletedTokens = 0;
  let deletedUploads = 0;
  let deletedEvents = 0;

  // 1. Delete expired view tokens
  try {
    const expiredTokensQuery = await db.collection("viewTokens")
      .where("expiresAt", "<=", now)
      .get();

    for (const doc of expiredTokensQuery.docs) {
      await doc.ref.delete();
      deletedTokens++;
    }
    console.log(`Deleted ${deletedTokens} expired view tokens`);
  } catch (err) {
    console.error("Error deleting expired view tokens:", err);
  }

  // 2. Delete rejected uploads older than 30 days
  const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  try {
    const fams = await db.collection("families").get();

    for (const fam of fams.docs) {
      const rejectedQuery = await fam.ref
        .collection("pendingUploads")
        .where("status", "==", "rejected")
        .where("rejectedAt", "<=", thirtyDaysAgo)
        .get();

      for (const upload of rejectedQuery.docs) {
        const data = upload.data();

        // Delete image from R2 if imageId exists
        if (data.imageId) {
          try {
            // Note: R2 deletion would require the R2 client
            // For now, just delete the Firestore document
            console.log(`Would delete image ${data.imageId} from R2`);
          } catch (e) {
            console.error(`Failed to delete image ${data.imageId}:`, e);
          }
        }

        await upload.ref.delete();
        deletedUploads++;
      }
    }
    console.log(`Deleted ${deletedUploads} old rejected uploads`);
  } catch (err) {
    console.error("Error deleting rejected uploads:", err);
  }

  // 3. Delete old Stripe webhook event records (keep for 7 days for debugging)
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  try {
    const oldEventsQuery = await db.collection("stripeEvents")
      .where("processedAt", "<=", sevenDaysAgo)
      .get();

    for (const doc of oldEventsQuery.docs) {
      await doc.ref.delete();
      deletedEvents++;
    }
    console.log(`Deleted ${deletedEvents} old Stripe event records`);
  } catch (err) {
    console.error("Error deleting old Stripe events:", err);
  }

  console.log(`cleanupExpiredData completed: ${deletedTokens} tokens, ${deletedUploads} uploads, ${deletedEvents} events deleted`);
});

/**
 * Storage reconciliation job - runs weekly on Sunday at 4 AM
 * Recalculates actual storage usage for each family to fix any drift
 */
exports.reconcileStorage = onSchedule("0 4 * * 0", async () => {
  const db = getFirestore();
  let familiesUpdated = 0;

  try {
    const fams = await db.collection("families").get();

    for (const fam of fams.docs) {
      try {
        // Get all pages for this family and sum up storage
        const pagesSnap = await fam.ref.collection("pages").get();

        let totalBytes = 0;

        for (const pageDoc of pagesSnap.docs) {
          const pageData = pageDoc.data();

          // Count bytes from page state items
          if (pageData.state?.items && Array.isArray(pageData.state.items)) {
            for (const item of pageData.state.items) {
              if (item.type === "photo" && item.sizeBytes) {
                totalBytes += item.sizeBytes;
              }
            }
          }
        }

        // Also count approved pending uploads
        const approvedUploads = await fam.ref
          .collection("pendingUploads")
          .where("status", "==", "approved")
          .get();

        for (const upload of approvedUploads.docs) {
          const data = upload.data();
          if (data.sizeBytes) {
            totalBytes += data.sizeBytes;
          }
        }

        // Update family document with correct storage count
        const currentData = fam.data();
        const currentBytes = currentData.storageUsedBytes || 0;

        // Only update if there's a significant difference (> 1MB drift)
        if (Math.abs(currentBytes - totalBytes) > 1024 * 1024) {
          await fam.ref.update({
            storageUsedBytes: totalBytes,
            storageLastReconciled: FieldValue.serverTimestamp(),
          });
          console.log(`Family ${fam.id}: storage corrected from ${currentBytes} to ${totalBytes}`);
          familiesUpdated++;
        }
      } catch (err) {
        console.error(`Error reconciling storage for family ${fam.id}:`, err);
      }
    }

    console.log(`reconcileStorage completed: ${familiesUpdated} families updated`);
  } catch (err) {
    console.error("Storage reconciliation failed:", err);
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Page Rendering (Puppeteer)
// ───────────────────────────────────────────────────────────────────────────────

const { renderPage, isProUser, CANVAS_WIDTH, CANVAS_HEIGHT } = require("./renderPage");

/**
 * Render a scrapbook page as an image or PDF
 * POST /renderPageImage
 * Body: { familyId, pageId, format: "png" | "jpeg" | "pdf" }
 * Headers: Authorization: Bearer <firebase-id-token>
 *
 * Returns: { result: { data: base64, mimeType, width, height } }
 */
exports.renderPageImage = onRequest(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 120,
    cors: true,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      // Verify authentication
      const auth = await verifyAuth(req);
      if (!auth?.uid) {
        return sendError(res, "unauthenticated", "Sign in required");
      }

      // Parse request
      const { familyId, pageId, format = "jpeg" } = req.body || {};
      if (!familyId || !pageId) {
        return sendError(res, "invalid-argument", "familyId and pageId are required");
      }

      // Validate format
      const validFormats = ["png", "jpeg", "pdf"];
      if (!validFormats.includes(format)) {
        return sendError(res, "invalid-argument", `Invalid format. Must be one of: ${validFormats.join(", ")}`);
      }

      try {
        const db = getFirestore();

        // Check if user has access to this page (member of family)
        const memDoc = await db.collection("memberships").doc(memId(auth.uid, familyId)).get();
        if (!memDoc.exists) {
          return sendError(res, "permission-denied", "You don't have access to this family");
        }

        // Check if page exists
        const pageDoc = await db.collection("families").doc(familyId).collection("pages").doc(pageId).get();
        if (!pageDoc.exists) {
          return sendError(res, "not-found", "Page not found");
        }

        // Determine quality based on subscription
        const isPro = await isProUser(auth.uid);
        const quality = isPro ? "pro" : "standard";

        console.log(`Rendering page ${pageId} for user ${auth.uid} (quality: ${quality}, format: ${format})`);

        // Render the page
        const imageBuffer = await renderPage(familyId, pageId, format, quality);

        // Determine MIME type
        const mimeType = format === "pdf" ? "application/pdf" :
                         format === "png" ? "image/png" : "image/jpeg";

        // Calculate dimensions
        const scaleFactor = quality === "pro" ? 4.17 : 1;
        const width = Math.round(CANVAS_WIDTH * scaleFactor);
        const height = Math.round(CANVAS_HEIGHT * scaleFactor);

        // Return as base64
        return sendSuccess(res, {
          data: imageBuffer.toString("base64"),
          mimeType,
          width,
          height,
          quality,
          format,
        });

      } catch (error) {
        console.error("Render error:", error);
        return sendError(res, "internal", error.message || "Failed to render page");
      }
    });
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// Book Compiler - Yearbook PDF Generation
// ───────────────────────────────────────────────────────────────────────────────

const { initializeCompilation } = require("./bookCompiler/init");
const { handleJobChange } = require("./bookCompiler/renderBatch");
const { handleMergePhase, refreshDownloadUrl } = require("./bookCompiler/merge");
const { updateOrderFromWebhook, calculateShippingCost, createPrintJob, storePrintOrder } = require("./bookCompiler/fulfillment/lulu");
const { generateSimpleCover } = require("./bookCompiler/coverGenerator");

/**
 * Initialize a book compilation
 * POST /compileBookInit
 * Body: { familyId, bookSize, pageIds?, forceRecompile?, acknowledgeWarnings? }
 * Headers: Authorization: Bearer <firebase-id-token>
 */
exports.compileBookInit = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      const auth = await verifyAuth(req);
      if (!auth?.uid) {
        return sendError(res, "unauthenticated", "Sign in required");
      }
      await initializeCompilation(req, res, auth);
    });
  }
);

/**
 * Process render batches - triggered by compilation job updates
 * Renders pages in batches of 5, uploads to R2
 */
exports.processRenderBatch = onDocumentWritten(
  {
    document: "families/{familyId}/compilationJobs/{jobId}",
    region: "us-central1",
    memory: "2GiB",
    timeoutSeconds: 540,
    cpu: 2,
  },
  async (event) => {
    await handleJobChange(event);
  }
);

/**
 * Merge PDFs when all pages are rendered
 * Triggered when job status changes to "merging"
 */
exports.mergeBookPdf = onDocumentUpdated(
  {
    document: "families/{familyId}/compilationJobs/{jobId}",
    region: "us-central1",
    memory: "4GiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Only trigger when status changes to "merging"
    if (before?.status !== "merging" && after?.status === "merging") {
      const jobId = event.params.jobId;
      console.log(`Merge phase triggered for job ${jobId}`);
      await handleMergePhase(after, jobId);
    }
  }
);

/**
 * Refresh download URL for a completed book
 * POST /refreshBookDownload
 * Body: { familyId, jobId }
 */
exports.refreshBookDownload = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      const auth = await verifyAuth(req);
      if (!auth?.uid) {
        return sendError(res, "unauthenticated", "Sign in required");
      }

      const { familyId, jobId } = req.body || {};
      if (!familyId || !jobId) {
        return sendError(res, "invalid-argument", "familyId and jobId are required");
      }

      // Verify user has access to family
      const db = getFirestore();
      const memDoc = await db.collection("memberships").doc(memId(auth.uid, familyId)).get();
      if (!memDoc.exists) {
        return sendError(res, "permission-denied", "You don't have access to this family");
      }

      try {
        const downloadInfo = await refreshDownloadUrl(familyId, jobId);
        return sendSuccess(res, downloadInfo);
      } catch (error) {
        return sendError(res, "internal", error.message);
      }
    });
  }
);

/**
 * Lulu webhook handler for print order status updates
 * POST /luluWebhook
 */
exports.luluWebhook = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Verify webhook signature
    const signature = req.get("X-Lulu-Signature");
    const secret = process.env.LULU_WEBHOOK_SECRET;

    if (secret && signature) {
      const crypto = require("crypto");
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (signature !== expectedSig) {
        console.warn("Invalid Lulu webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const { id: printJobId, status, shipping_info } = req.body || {};

    if (!printJobId) {
      return res.status(400).json({ error: "Missing print job ID" });
    }

    try {
      await updateOrderFromWebhook(printJobId, { status, shipping_info });
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Lulu webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Calculate shipping cost for a print order
 * POST /calculateLuluCost
 * Body: { bookSize, coverType, pageCount, quantity, shippingAddress, shippingLevel }
 */
exports.calculateLuluCost = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      const auth = await verifyAuth(req);
      if (!auth?.uid) {
        return sendError(res, "unauthenticated", "Sign in required");
      }

      const { bookSize, coverType, pageCount, quantity, shippingAddress, shippingLevel } = req.body || {};

      if (!bookSize || !pageCount || !quantity || !shippingAddress) {
        return sendError(res, "invalid-argument", "Missing required fields");
      }

      try {
        const cost = await calculateShippingCost({
          bookSize,
          coverType: coverType || "soft",
          pageCount,
          quantity,
          shippingAddress,
          shippingLevel: shippingLevel || "MAIL",
        });

        return sendSuccess(res, cost);
      } catch (error) {
        console.error("Cost calculation error:", error);
        return sendError(res, "internal", error.message);
      }
    });
  }
);

/**
 * Create a Lulu print job
 * POST /createLuluPrintJob
 * Body: {
 *   familyId, orderId, compilationJobId, r2Key, bookSize, coverType, pageCount,
 *   quantity, shippingAddress, shippingLevel, contactEmail,
 *   // Cover customization (optional):
 *   familyName, bookTitle, primaryColor, secondaryColor
 * }
 */
exports.createLuluPrintJob = onRequest(
  {
    region: "us-central1",
    memory: "512MiB", // Increased for cover generation
    timeoutSeconds: 120, // Increased for cover generation
    cors: true,
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      const auth = await verifyAuth(req);
      if (!auth?.uid) {
        return sendError(res, "unauthenticated", "Sign in required");
      }

      const {
        familyId,
        orderId,
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
      } = req.body || {};

      if (!familyId || !r2Key || !shippingAddress) {
        return sendError(res, "invalid-argument", "Missing required fields");
      }

      // Verify user has access to family
      const db = getFirestore();
      const memDoc = await db.collection("memberships").doc(memId(auth.uid, familyId)).get();
      if (!memDoc.exists) {
        return sendError(res, "permission-denied", "You don't have access to this family");
      }

      try {
        // Get family name if not provided
        let displayFamilyName = familyName;
        if (!displayFamilyName) {
          const familyDoc = await db.collection("families").doc(familyId).get();
          displayFamilyName = familyDoc.data()?.name || "Family";
        }

        // Step 1: Generate the cover PDF
        console.log(`Generating cover PDF for family ${familyId}...`);
        const coverResult = await generateSimpleCover({
          familyId,
          familyName: displayFamilyName,
          bookTitle: bookTitle || `${new Date().getFullYear()} Yearbook`,
          bookSize: bookSize || "8x8",
          pageCount: pageCount || 20,
          coverType: coverType || "soft",
          paperType: "standard",
          // Cover style options
          coverMode: coverMode || "solid",
          primaryColor: primaryColor || "#1e3a5f",
          secondaryColor: secondaryColor || "#ffffff",
          // Image URLs for image-based cover modes
          frontCoverImageUrl,
          wraparoundImageUrl,
        });

        console.log(`Cover PDF generated: ${coverResult.r2Key}`);

        // Step 2: Create the print job with Lulu
        const luluResponse = await createPrintJob({
          familyId,
          jobId: compilationJobId,
          interiorR2Key: r2Key,
          coverR2Key: coverResult.r2Key,
          bookSize: bookSize || "8x8",
          coverType: coverType || "soft",
          quantity: quantity || 1,
          shippingAddress,
          shippingLevel: shippingLevel || "MAIL",
          contactEmail: contactEmail || auth.email,
          pageCount: pageCount || 20,
          createdBy: auth.uid,
        });

        return sendSuccess(res, {
          printJobId: luluResponse.id,
          status: luluResponse.status?.name || "CREATED",
          coverR2Key: coverResult.r2Key,
        });
      } catch (error) {
        console.error("Create print job error:", error);
        return sendError(res, "internal", error.message);
      }
    });
  }
);
