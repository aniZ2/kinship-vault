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
