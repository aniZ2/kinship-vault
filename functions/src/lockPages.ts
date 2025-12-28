// functions/src/lockPages.ts (Firebase Functions v2)
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
admin.initializeApp();

export const enforcePageLocks = onSchedule("every 15 minutes", async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7*24*60*60*1000));

  // 1) Lock pages older than 7 days (and not currently in an unlock window)
  const fams = await db.collection("families").get();
  const writes: FirebaseFirestore.WriteBatch[] = [];
  let batch = db.batch();
  let ops = 0;

  for (const fam of fams.docs) {
    const pagesRef = fam.ref.collection("pages");

    const oldPages = await pagesRef
      .where("createdAt", "<=", sevenDaysAgo)
      .where("locked", "==", false)
      .get();

    oldPages.forEach((p) => {
      const d = p.data();
      const unlockActive = d.unlockExpiresAt && d.unlockExpiresAt.toMillis() > Date.now();
      if (!unlockActive) {
        batch.update(p.ref, { locked: true });
        if (++ops >= 450) { writes.push(batch); batch = db.batch(); ops = 0; }
      }
    });

    // 2) Re-lock pages whose temporary unlock expired
    const unlocked = await pagesRef
      .where("unlockExpiresAt", "<=", now)
      .where("unlockExpiresAt", "!=", null)
      .get();

    unlocked.forEach((p) => {
      batch.update(p.ref, { locked: true, unlockExpiresAt: null });
      if (++ops >= 450) { writes.push(batch); batch = db.batch(); ops = 0; }
    });
  }

  writes.push(batch);
  await Promise.all(writes.map((b) => b.commit()));
});
