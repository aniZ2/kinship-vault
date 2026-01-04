const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({
  projectId: 'kinshipvault-47ad0'
});

const db = admin.firestore();

async function findLockedPages() {
  const families = await db.collection('families').limit(10).get();

  for (const fam of families.docs) {
    const pages = await db.collection('families').doc(fam.id)
      .collection('pages')
      .where('isLocked', '==', true)
      .limit(5)
      .get();

    if (!pages.empty) {
      console.log('\nFamily:', fam.id, '-', fam.data().name);
      pages.docs.forEach(p => {
        console.log('  Page:', p.id, '-', p.data().title || '(untitled)');
      });
    }
  }
}

findLockedPages().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
