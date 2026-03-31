const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const GUNLUK_LIMIT = 3;

async function analizHakkiKontrol(kullaniciId) {
  try {
    const bugun = new Date().toISOString().split('T')[0];
    const ref = db.collection('analizLimitler').doc(`${kullaniciId}_${bugun}`);
    const doc = await ref.get();

    if (!doc.exists) {
      await ref.set({
        kullaniciId,
        tarih: bugun,
        kullanim: 1,
        olusturulma: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    }

    const kullanim = doc.data().kullanim || 0;
    if (kullanim >= GUNLUK_LIMIT) return false;

    await ref.update({ kullanim: admin.firestore.FieldValue.increment(1) });
    return true;
  } catch (e) {
    console.error('Firestore limit hatası:', e);
    return true;
  }
}

async function kalanHak(kullaniciId) {
  try {
    const bugun = new Date().toISOString().split('T')[0];
    const ref = db.collection('analizLimitler').doc(`${kullaniciId}_${bugun}`);
    const doc = await ref.get();
    if (!doc.exists) return GUNLUK_LIMIT;
    const kullanim = doc.data().kullanim || 0;
    return Math.max(0, GUNLUK_LIMIT - kullanim);
  } catch (e) {
    return GUNLUK_LIMIT;
  }
}

module.exports = { analizHakkiKontrol, kalanHak };